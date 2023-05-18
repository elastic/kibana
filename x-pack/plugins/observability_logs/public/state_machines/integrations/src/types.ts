/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IImmutableCache } from '../../../../common/immutable_cache';
import { FindIntegrationsResponse, FindIntegrationsRequestQuery } from '../../../../common/latest';
import { Integration } from '../../../../common/data_streams';

export interface DefaultIntegrationsContext {
  cache: IImmutableCache<FindIntegrationsRequestQuery, FindIntegrationsResponse>;
  integrations: Integration[] | null;
  error: Error | null;
  search: FindIntegrationsRequestQuery;
  total?: number;
}

export interface IntegrationsSearchParams {
  nameQuery?: string;
  sortOrder?: 'asc' | 'desc';
}

export type IntegrationTypestate =
  | {
      value: 'uninitialized';
      context: DefaultIntegrationsContext;
    }
  | {
      value: 'loading';
      context: DefaultIntegrationsContext;
    }
  | {
      value: 'loaded';
      context: DefaultIntegrationsContext;
    }
  | {
      value: 'loadingFailed';
      context: DefaultIntegrationsContext;
    }
  | {
      value: 'loadingMore';
      context: DefaultIntegrationsContext;
    }
  | {
      value: 'debouncingSearch';
      context: DefaultIntegrationsContext;
    }
  | {
      value: 'checkingMoreIntegrationsAvailability';
      context: DefaultIntegrationsContext;
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
      type: 'RELOAD_INTEGRATIONS';
    }
  | {
      type: 'LOAD_MORE_INTEGRATIONS';
    }
  | {
      type: 'SEARCH_INTEGRATIONS';
      search: IntegrationsSearchParams;
    };
