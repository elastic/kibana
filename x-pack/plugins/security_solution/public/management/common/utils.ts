/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const parseQueryFilterToKQL = (filter: string, fields: Readonly<string[]>): string => {
  if (!filter) return '';
  const kuery = fields
    .map(
      (field) =>
        `exception-list-agnostic.attributes.${field}:(*${filter
          .trim()
          .replace(/([\)\(\<\>\}\{\"\:\\])/gm, '\\$&') // Escape problematic chars
          .replace(/\s/gm, '*')}*)`
    )
    .join(' OR ');

  return kuery;
};
