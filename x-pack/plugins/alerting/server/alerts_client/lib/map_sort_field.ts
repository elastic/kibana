/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const sortFieldMap: Record<string, string> = {
  name: 'name.keyword',
};

export function mapSortField(field?: string): string | undefined {
  return field ? sortFieldMap[field] || field : undefined;
}
