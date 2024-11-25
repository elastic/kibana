/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntitySourceDefinition } from '../types';

const sourceCommand = ({ source }: { source: EntitySourceDefinition }) => {
  let query = `FROM ${source.index_patterns}`;

  const esMetadataFields = source.metadata_fields.filter((field) =>
    ['_index', '_id'].includes(field)
  );
  if (esMetadataFields.length) {
    query += ` METADATA ${esMetadataFields.join(',')}`;
  }

  return query;
};

const filterCommands = ({
  source,
  start,
  end,
}: {
  source: EntitySourceDefinition;
  start: string;
  end: string;
}) => {
  const commands = [
    `WHERE ${source.timestamp_field} >= "${start}"`,
    `WHERE ${source.timestamp_field} <= "${end}"`,
  ];

  source.identity_fields.forEach((field) => {
    commands.push(`WHERE ${field} IS NOT NULL`);
  });

  source.filters.forEach((filter) => {
    commands.push(`WHERE ${filter}`);
  });

  return commands;
};

const statsCommand = ({ source }: { source: EntitySourceDefinition }) => {
  const aggs = [
    // default 'last_seen' attribute
    `entity.last_seen_timestamp=MAX(${source.timestamp_field})`,
    ...source.metadata_fields
      .filter((field) => !source.identity_fields.some((idField) => idField === field))
      .map((field) => `metadata.${field}=VALUES(${field})`),
  ];

  return `STATS ${aggs.join(',')} BY ${source.identity_fields.join(',')}`;
};

export function getEntityInstancesQuery({
  source,
  limit,
  start,
  end,
}: {
  source: EntitySourceDefinition;
  limit: number;
  start: string;
  end: string;
}): string {
  const commands = [
    sourceCommand({ source }),
    ...filterCommands({ source, start, end }),
    statsCommand({ source }),
    `SORT entity.last_seen_timestamp DESC`,
    `LIMIT ${limit}`,
  ];

  return commands.join('|');
}
