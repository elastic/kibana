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

export function getEntityInstancesQuery(source: EntitySource, limit: number): string {
  let query = `FROM ${source.index_patterns} |`;

  source.identity_fields.forEach((field) => {
    query += `WHERE ${field} IS NOT NULL |`;
  });

  source.filters.forEach((filter) => {
    query += `WHERE ${filter} |`;
  });

  const aggs = [
    // default 'last_seen' attribute
    'entity.last_seen_timestamp=MAX(@timestamp)',
    ...source.metadata_fields
      .filter((field) => !source.identity_fields.some((idField) => idField === field))
      .map((field) => `metadata.${field}=VALUES(${field})`),
  ];

  query += `STATS ${aggs.join(', ')} BY ${source.identity_fields.join(',')} |`;
  query += `SORT entity.last_seen_timestamp DESC |`;
  query += `LIMIT ${limit}`;

  return query;
}
