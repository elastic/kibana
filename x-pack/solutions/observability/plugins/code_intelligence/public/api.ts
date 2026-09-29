/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';

export interface Repository {
  repository: string;
}

export interface ExtractionStatus {
  id: string;
  repository: string;
  revision: string;
  status: 'running' | 'completed' | 'failed';
  counts: Record<string, number>;
  errors: string[];
  warnings?: string[];
  startedAt: string;
  completedAt?: string;
}

export interface CatalogItem {
  id: string;
  repository?: string;
  signal_type?: string;
  title?: string;
  query?: string;
  evidence?: Array<{ path?: string; line?: number }>;
  validation?: { status?: string };
  [key: string]: unknown;
}

export interface CatalogResponse {
  page: number;
  perPage: number;
  total: number;
  items: CatalogItem[];
}

type RepositoriesResponse =
  | string[]
  | Array<string | { repository: string }>
  | {
      repositories?: Array<string | { repository: string }>;
      items?: Array<string | { repository: string }>;
    };

const repositoryName = (value: string | { repository: string }): string =>
  typeof value === 'string' ? value : value.repository;

export const getRepositories = async (http: HttpSetup): Promise<Repository[]> => {
  const response = await http.get<RepositoriesResponse>('/internal/code_intelligence/repositories');
  const values = Array.isArray(response) ? response : response.repositories ?? response.items ?? [];
  return values
    .map(repositoryName)
    .filter((repository) => repository.length >= 3 && repository.length <= 256)
    .map((repository) => ({ repository }));
};

export const startExtraction = (
  http: HttpSetup,
  repository: string,
  revision: string
): Promise<{ id: string }> =>
  http.post('/internal/code_intelligence/extractions', {
    body: JSON.stringify({ repository, revision }),
  });

export const getExtraction = (http: HttpSetup, id: string): Promise<ExtractionStatus> =>
  http.get(`/internal/code_intelligence/extractions/${encodeURIComponent(id)}`);

export const getCatalog = (
  http: HttpSetup,
  query: {
    repository: string;
    kind?: 'log' | 'trace' | 'metric';
    q?: string;
    page: number;
  }
): Promise<CatalogResponse> =>
  http.get('/internal/code_intelligence/catalog', {
    query: {
      repository: query.repository,
      ...(query.kind === undefined ? {} : { kind: query.kind }),
      ...(query.q === undefined ? {} : { q: query.q }),
      page: query.page,
      perPage: 25,
    },
  });
