/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';

import type { BatchRepositoryRequest, ExtractionBatchStatus } from '../common/extraction_batch';
import type { RepositorySettings, RepositorySettingsInput } from '../common/repository_settings';

export type { ExtractionBatchStatus, RepositoryExtractionStatus } from '../common/extraction_batch';
export type { RepositorySettings, RepositorySettingsInput } from '../common/repository_settings';

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
