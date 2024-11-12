/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface EntitySource {
  type: string;
  index_patterns: string[];
  identity_fields: string[];
  metadata_fields: string[];
  filters: string[];
}

const sourceCommand = (source: EntitySource) => {
  let query = `FROM ${source.index_patterns}`;

  const esMetadataFields = source.metadata_fields.filter((field) =>
    ['_index', '_id'].includes(field)
  );
  if (esMetadataFields.length) {
    query += ` METADATA ${esMetadataFields.join(',')}`;
  }

  return query;
};

const filterCommands = (source: EntitySource) => {
  const commands: string[] = [];

  source.identity_fields.forEach((field) => {
    commands.push(`WHERE ${field} IS NOT NULL`);
  });

  source.filters.forEach((filter) => {
    commands.push(`WHERE ${filter}`);
  });

  return commands;
};

const statsCommand = (source: EntitySource) => {
  const aggs = [
    // default 'last_seen' attribute
    'entity.last_seen_timestamp=MAX(@timestamp)',
    ...source.metadata_fields
      .filter((field) => !source.identity_fields.some((idField) => idField === field))
      .map((field) => `metadata.${field}=VALUES(${field})`),
  ];

  return `STATS ${aggs.join(', ')} BY ${source.identity_fields.join(',')}`;
};

export function getEntityInstancesQuery(source: EntitySource, limit: number): string {
  const commands = [
    sourceCommand(source),
    ...filterCommands(source),
    statsCommand(source),
    `SORT entity.last_seen_timestamp DESC`,
    `LIMIT ${limit}`,
  ];

  return commands.join('|');
}
