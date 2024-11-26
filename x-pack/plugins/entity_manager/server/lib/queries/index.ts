/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { compact, last, uniq } from 'lodash';

export const entitySourceSchema = z.object({
  type: z.string(),
  timestamp_field: z.optional(z.string()),
  index_patterns: z.array(z.string()),
  identity_fields: z.array(z.string()),
  metadata_fields: z.array(z.string()),
  filters: z.array(z.string()),
});

export type EntitySource = z.infer<typeof entitySourceSchema>;

const hasEntityTimestamp = (sources: EntitySource[]) => {
  return sources.some((source) => source.timestamp_field);
};

const sourceCommand = ({
  sources,
  metadataFields,
}: {
  sources: EntitySource[];
  metadataFields: string[];
}) => {
  const indexPatterns = sources.flatMap((source) => source.index_patterns).join(', ');
  const esMetadataFields = ['_index', ...metadataFields.filter((field) => ['_id'].includes(field))];

  return `FROM ${indexPatterns} METADATA ${esMetadataFields.join(', ')}`;
};

const sourcesEvalCommand = ({ sources }: { sources: EntitySource[] }) => {
  const evals = sources.map((source, index) => {
    const conditions = [
      source.index_patterns
        .map((pattern) => `_index LIKE "*${last(pattern.split(':'))}*"`)
        .join(' OR '),

      source.identity_fields.map((field) => `${field} IS NOT NULL`).join(' AND '),
    ];

    if (source.timestamp_field) {
      conditions.push(`${source.timestamp_field} IS NOT NULL`);
    }

    return `EVAL is_source_${index} = ${conditions
      .map((condition) => '(' + condition + ')')
      .join(' AND ')}`;
  });

  return evals.join(' | ');
};

const idEvalCommand = ({ sources }: { sources: EntitySource[] }) => {
  const conditions = sources.flatMap((source, index) => {
    return [
      `is_source_${index}`,
      source.identity_fields.length === 1
        ? source.identity_fields[0]
        : `CONCAT(${source.identity_fields.join(', ":", ')})`,
    ];
  });
  return `EVAL entity.id = CASE(${conditions.join(', ')})`;
};

const timestampEvalCommand = ({ sources }: { sources: EntitySource[] }) => {
  const conditions = sources.flatMap((source, index) => {
    if (!source.timestamp_field) return [];

    return [`is_source_${index}`, source.timestamp_field];
  });

  if (!conditions.length) return '';

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
    'entity.id IS NOT NULL',
    sources
      .map((source, index) => {
        const filters = [`is_source_${index}`, ...source.filters.map((filter) => `(${filter})`)];
        if (source.timestamp_field) {
          filters.push(
            `(${source.timestamp_field} >= "${start}" AND ${source.timestamp_field} <= "${end}")`
          );
        }

        return '(' + filters.join(' AND ') + ')';
      })
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
    ...uniq(sources.flatMap((source) => source.identity_fields)).map(
      (field) => `${field}=TOP(${field}, 1, "desc")`
    ),
    ...metadataFields.map((field) => `metadata.${field}=VALUES(${field})`),
  ];

  if (hasEntityTimestamp(sources)) {
    aggs.push('entity.last_seen_timestamp=MAX(entity.timestamp)');
  }

  return `STATS ${aggs.join(', ')} BY entity.id`;
};

const sortCommand = ({ sources }: { sources: EntitySource[] }) => {
  if (hasEntityTimestamp(sources)) {
    return 'SORT entity.last_seen_timestamp DESC';
  }

  return 'SORT entity.id DESC';
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
  const commands = compact([
    sourceCommand({ sources, metadataFields }),
    sourcesEvalCommand({ sources }),
    idEvalCommand({ sources }),
    timestampEvalCommand({ sources }),
    filterCommands({ sources, start, end }),
    statsCommand({ sources, metadataFields }),
    sortCommand({ sources }),
    `LIMIT ${limit}`,
  ]);

  return commands.join(' | ');
}
