/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IImmutableCache } from '../../../../common/immutable_cache';
import { FindIntegrationsResponse, SortOrder, SearchAfter } from '../../../../common/latest';
import { Integration, SearchStrategy } from '../../../../common/data_streams';

export interface IntegrationsSearchParams {
  nameQuery?: string;
  searchAfter?: SearchAfter;
  sortOrder?: SortOrder;
  strategy?: SearchStrategy;
  integrationId?: string;
}

interface WithCache {
  cache: IImmutableCache<IntegrationsSearchParams, FindIntegrationsResponse>;
}

interface WithSearch {
  search: IntegrationsSearchParams;
}

interface WithIntegrations {
  integrationsSource: Integration[] | null;
  integrations: Integration[] | null;
}

interface WithNullishIntegrations {
  integrationsSource: null;
  integrations: null;
}

interface WithError {
  error: Error;
}

interface WithNullishError {
  error: null;
}

interface WithTotal {
  total: number;
}

export type DefaultIntegrationsContext = WithCache &
  WithNullishIntegrations &
  WithSearch &
  WithNullishError;

type LoadingIntegrationsContext = DefaultIntegrationsContext;

type LoadedIntegrationsContext = WithCache &
  WithIntegrations &
  WithTotal &
  WithSearch &
  WithNullishError;

type LoadingFailedIntegrationsContext = WithCache &
  WithIntegrations &
  Partial<WithTotal> &
  WithSearch &
  WithError;

type SearchingIntegrationsContext = LoadedIntegrationsContext | LoadingFailedIntegrationsContext;

export type IntegrationTypestate =
  | {
      value: 'uninitialized';
      context: DefaultIntegrationsContext;
    }
  | {
      value: 'loading';
      context: LoadingIntegrationsContext;
    }
  | {
      value: 'loaded';
      context: LoadedIntegrationsContext;
    }
  | {
      value: 'loadingFailed';
      context: LoadingFailedIntegrationsContext;
    }
  | {
      value: 'loadingMore';
      context: LoadingIntegrationsContext;
    }
  | {
      value: 'debouncingSearch';
      context: SearchingIntegrationsContext;
    }
  | {
      value: 'searchingStreams';
      context: SearchingIntegrationsContext;
    };

export type IntegrationsContext = IntegrationTypestate['context'];

export type IntegrationsEvent =
  | {
      type: 'LOADING_SUCCEEDED';
      data: FindIntegrationsResponse;
    }
  | {
      type: 'LOADING_FAILED';
      error: Error;
    }
  | {
      type: 'SEARCH_SUCCEEDED';
      integrations: Integration[];
    }
  | {
      type: 'SEARCH_FAILED';
      error: Error;
    }
  | {
      type: 'LOAD_MORE_INTEGRATIONS';
    }
  | {
      type: 'RELOAD_INTEGRATIONS';
    }
  | {
      type: 'SEARCH';
      search: IntegrationsSearchParams;
      delay?: number;
    };
