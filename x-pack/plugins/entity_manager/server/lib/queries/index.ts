/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export const entitySourceSchema = z.object({
  type: z.string(),
  timestamp_field: z.optional(z.string()),
  index_patterns: z.array(z.string()),
  identity_fields: z.array(z.string()),
  metadata_fields: z.array(z.string()),
  filters: z.array(z.string()),
  display_name: z.optional(z.string()),
});

export interface SortBy {
  field: string;
  direction: 'ASC' | 'DESC';
}

export type EntitySource = z.infer<typeof entitySourceSchema>;

const sourceCommand = ({ source }: { source: EntitySource }) => {
  let query = `FROM ${source.index_patterns.join(', ')}`;

  const esMetadataFields = source.metadata_fields.filter((field) =>
    ['_index', '_id'].includes(field)
  );
  if (esMetadataFields.length) {
    query += ` METADATA ${esMetadataFields.join(', ')}`;
  }

  return query;
};

const whereCommand = ({
  source,
  start,
  end,
}: {
  source: EntitySource;
  start: string;
  end: string;
}) => {
  const filters = [
    source.identity_fields.map((field) => `${field} IS NOT NULL`).join(' AND '),
    ...source.filters,
  ];

  if (source.timestamp_field) {
    filters.push(
      `${source.timestamp_field} >= "${start}" AND ${source.timestamp_field} <= "${end}"`
    );
  }

  return filters.map((filter) => `WHERE ${filter}`).join(' | ');
};

const statsCommand = ({ source }: { source: EntitySource }) => {
  const aggs = source.metadata_fields
    .filter((field) => !source.identity_fields.some((idField) => idField === field))
    .map((field) => `${field} = VALUES(${field})`);

  if (source.timestamp_field) {
    aggs.push(`entity.last_seen_timestamp = MAX(${source.timestamp_field})`);
  }

  if (source.display_name) {
    aggs.push(`${source.display_name} = MAX(${source.display_name})`);
  }

  return `STATS ${aggs.join(', ')} BY ${source.identity_fields.join(', ')}`;
};

const evalCommand = ({ source }: { source: EntitySource }) => {
  const id =
    source.identity_fields.length === 1
      ? source.identity_fields[0]
      : `CONCAT(${source.identity_fields.join(', ":", ')})`;

  const displayName = source.display_name
    ? `COALESCE(${source.display_name}, entity.id)`
    : 'entity.id';

  return `EVAL ${[
    `entity.type = "${source.type}"`,
    `entity.id = ${id}`,
    `entity.display_name = ${displayName}`,
  ].join(', ')}`;
};

const sortCommand = ({ source, sortBy }: { source: EntitySource; sortBy?: SortBy }) => {
  if (sortBy) {
    return `SORT ${sortBy.field} ${sortBy.direction}`;
  }

  if (source.timestamp_field) {
    return `SORT entity.last_seen_timestamp DESC`;
  }

  return `SORT entity.id ASC`;
};

export function getEntityInstancesQuery({
  source,
  limit,
  start,
  end,
  sortBy,
}: {
  source: EntitySource;
  limit: number;
  start: string;
  end: string;
  sortBy?: SortBy;
}): string {
  const commands = [
    sourceCommand({ source }),
    whereCommand({ source, start, end }),
    statsCommand({ source }),
    evalCommand({ source }),
    sortCommand({ source, sortBy }),
    `LIMIT ${limit}`,
  ];

  return commands.join(' | ');
}
