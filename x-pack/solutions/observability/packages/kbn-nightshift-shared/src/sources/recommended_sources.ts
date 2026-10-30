/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RecommendedSource {
  id: string;
  title: string;
  description: string;
  tags: string[];
  esql: string;
}

export const RECOMMENDED_SOURCES: readonly RecommendedSource[] = [
  {
    id: 'logs',
    title: 'Logs',
    description: 'Application and infrastructure logs across your environment.',
    tags: ['logs'],
    esql: 'FROM logs*',
  },
];

export const normalizeSourceEsql = (esql: string): string =>
  esql.trim().replace(/\s+/g, ' ').toLowerCase();

export interface RecommendedSourcesResponse {
  recommendations: RecommendedSource[];
}
