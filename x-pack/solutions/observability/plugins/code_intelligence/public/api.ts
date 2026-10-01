/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';

import type {
  CatalogRepositorySummary,
  CatalogSeverity,
  CatalogSignalType,
  CatalogSort,
} from '../common/catalog_filters';
import type { BatchRepositoryRequest, ExtractionBatchStatus } from '../common/extraction_batch';
import type { RepositorySettings, RepositorySettingsInput } from '../common/repository_settings';

export type { ExtractionBatchStatus, RepositoryExtractionStatus } from '../common/extraction_batch';
export type { RepositorySettings, RepositorySettingsInput } from '../common/repository_settings';
export type { CatalogRepositorySummary } from '../common/catalog_filters';

/** A repository row from the settings index. */
export type Repository = RepositorySettings;

export interface CatalogItem {
  id: string;
  repository?: string;
  signal_type?: string;
  title?: string;
  query?: string;
  description?: string;
  revision?: string;
  severity_score?: number;
  evidence?: Array<{ path?: string; line?: number; excerpt?: string }>;
  validation?: { status?: string; diagnostics?: string[] };
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface CatalogResponse {
  page: number;
  perPage: number;
  total: number;
  items: CatalogItem[];
}

const repositoryPath = (repository: string): string => {
  const [owner = '', name = ''] = repository.split('/');
  return `/internal/code_intelligence/repositories/${encodeURIComponent(
    owner
  )}/${encodeURIComponent(name)}`;
};

export const getRepositories = async (http: HttpSetup): Promise<Repository[]> => {
  const response = await http.get<{ repositories?: Repository[] }>(
    '/internal/code_intelligence/repositories'
  );
  return response.repositories ?? [];
};

export const saveRepository = async (
  http: HttpSetup,
  input: RepositorySettingsInput
): Promise<Repository> => {
  const response = await http.put<{ repository: Repository }>(repositoryPath(input.repository), {
    body: JSON.stringify(input),
  });
  return response.repository;
};

export const deleteRepository = (http: HttpSetup, repository: string): Promise<unknown> =>
  http.delete(repositoryPath(repository));

/** Starts 1 batch; without repositories, the server runs every enabled repository at its default ref. */
export const startBatch = (
  http: HttpSetup,
  repositories?: BatchRepositoryRequest[]
): Promise<{ id: string }> =>
  http.post('/internal/code_intelligence/extractions', {
    body: JSON.stringify(repositories === undefined ? {} : { repositories }),
  });

export const getBatch = (http: HttpSetup, id: string): Promise<ExtractionBatchStatus> =>
  http.get(`/internal/code_intelligence/extractions/${encodeURIComponent(id)}`);

/** An empty filter list matches every value. */
export const getCatalog = (
  http: HttpSetup,
  query: {
    repositories: readonly string[];
    kinds: readonly CatalogSignalType[];
    severities: readonly CatalogSeverity[];
    sort: CatalogSort;
    q?: string;
    page: number;
  }
): Promise<CatalogResponse> =>
  http.get('/internal/code_intelligence/catalog', {
    query: {
      ...(query.repositories.length === 0 ? {} : { repository: [...query.repositories] }),
      ...(query.kinds.length === 0 ? {} : { kind: [...query.kinds] }),
      ...(query.severities.length === 0 ? {} : { severity: [...query.severities] }),
      ...(query.sort === 'default' ? {} : { sort: query.sort }),
      ...(query.q === undefined ? {} : { q: query.q }),
      page: query.page,
      perPage: 25,
    },
  });

export const getCatalogSummary = async (http: HttpSetup): Promise<CatalogRepositorySummary[]> => {
  const response = await http.get<{ repositories?: CatalogRepositorySummary[] }>(
    '/internal/code_intelligence/catalog_summary'
  );
  return response.repositories ?? [];
};
