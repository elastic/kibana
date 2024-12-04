/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntitySourceDefinition, SortBy } from '../types';

const sourceCommand = ({ source }: { source: EntitySourceDefinition }) => {
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
  source: EntitySourceDefinition;
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

const statsCommand = ({ source }: { source: EntitySourceDefinition }) => {
  const aggs = source.metadata_fields
    .filter((field) => !source.identity_fields.some((idField) => idField === field))
    .map((field) => `${field} = VALUES(${field})`);

  if (source.timestamp_field) {
    aggs.push(`entity.last_seen_timestamp = MAX(${source.timestamp_field})`);
  }

  if (source.display_name) {
    // ideally we want the latest value but there's no command yet
    // so we use MAX for now
    aggs.push(`${source.display_name} = MAX(${source.display_name})`);
  }

  return `STATS ${aggs.join(', ')} BY ${source.identity_fields.join(', ')}`;
};

const evalCommand = ({ source }: { source: EntitySourceDefinition }) => {
  const id =
    source.identity_fields.length === 1
      ? source.identity_fields[0]
      : `CONCAT(${source.identity_fields.join(', ":", ')})`;

  const displayName = source.display_name
    ? `COALESCE(${source.display_name}, entity.id)`
    : 'entity.id';

  return `EVAL ${[
    `entity.type = "${source.type_id}"`,
    `entity.id = ${id}`,
    `entity.display_name = ${displayName}`,
  ].join(', ')}`;
};

const sortCommand = ({ source, sort }: { source: EntitySourceDefinition; sort?: SortBy }) => {
  if (sort) {
    return `SORT ${sort.field} ${sort.direction}`;
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
  sort,
}: {
  source: EntitySourceDefinition;
  limit: number;
  start: string;
  end: string;
  sort?: SortBy;
}): string {
  const commands = [
    sourceCommand({ source }),
    whereCommand({ source, start, end }),
    statsCommand({ source }),
    evalCommand({ source }),
    sortCommand({ source, sort }),
    `LIMIT ${limit}`,
  ];

  return commands.join(' | ');
}
