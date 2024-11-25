/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { uniq } from 'lodash';

export const entitySourceSchema = z.object({
  type: z.string(),
  timestamp_field: z.optional(z.string()).default('@timestamp'),
  index_patterns: z.array(z.string()),
  identity_fields: z.array(z.string()),
  metadata_fields: z.array(z.string()),
  filters: z.array(z.string()),
});

export type EntitySource = z.infer<typeof entitySourceSchema>;

const sourceCommand = ({
  sources,
  metadataFields,
}: {
  sources: EntitySource[];
  metadataFields: string[];
}) => {
  let command = `FROM ${sources.flatMap((source) => source.index_patterns).join(', ')}`;

  const esMetadataFields = metadataFields.filter((field) => ['_index', '_id'].includes(field));
  if (esMetadataFields.length) {
    command += ` METADATA ${esMetadataFields.join(',')}`;
  }

  return command;
};

const idEvalCommand = ({ sources }: { sources: EntitySource[] }) => {
  const conditions = sources.flatMap((source) => {
    return [
      source.identity_fields.map((field) => `${field} IS NOT NULL`).join(' AND '),
      source.identity_fields.length === 1
        ? source.identity_fields[0]
        : `CONCAT(${source.identity_fields.join(', ":", ')})`,
    ];
  });
  return `EVAL entity.id = CASE(${conditions.join(', ')})`;
};

const timestampEvalCommand = ({ sources }: { sources: EntitySource[] }) => {
  const conditions = uniq(sources.map((source) => source.timestamp_field)).flatMap((field) => {
    return [`${field} IS NOT NULL`, field];
  });
  return `EVAL entity.timestamp = CASE(${conditions.join(', ')})`;
};

const filterCommands = ({
  sources,
  start,
  end,
}: {
  sources: EntitySource[];
  start: string;
  end: string;
}) => {
  const conditions = [
    'entity.id IS NOT NULL AND entity.timestamp IS NOT NULL',
    uniq(sources.map((source) => source.timestamp_field))
      .map((field) => `(${field} >= "${start}" AND ${field} <= "${end}")`)
      .join(' OR '),
  ];

  return conditions.map((condition) => `WHERE ${condition}`).join(' | ');
};

const statsCommand = ({
  sources,
  metadataFields,
}: {
  sources: EntitySource[];
  metadataFields: string[];
}) => {
  const aggs = [
    'entity.last_seen_timestamp=MAX(entity.timestamp)',
    ...uniq(sources.flatMap((source) => source.identity_fields)).map(
      (field) => `${field}=TOP(${field}, 1, "desc")`
    ),
    ...metadataFields.map((field) => `metadata.${field}=VALUES(${field})`),
  ];

  return `STATS ${aggs.join(', ')} BY entity.id`;
};

const sortCommand = () => {
  return 'SORT entity.last_seen_timestamp DESC';
};

export function getEntityInstancesQuery({
  sources,
  limit,
  start,
  end,
  metadataFields = [],
}: {
  sources: EntitySource[];
  limit: number;
  start: string;
  end: string;
  metadataFields?: string[];
}): string {
  const commands = [
    sourceCommand({ sources, metadataFields }),
    idEvalCommand({ sources }),
    timestampEvalCommand({ sources }),
    filterCommands({ sources, start, end }),
    statsCommand({ sources, metadataFields }),
    sortCommand(),
    `LIMIT ${limit}`,
  ];

  return commands.join(' | ');
}
