/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IImmutableCache } from '../../../../common/immutable_cache';
import {
  FindIntegrationsResponse,
  FindIntegrationsRequestQuery,
  SortOrder,
} from '../../../../common/latest';
import { Integration, SearchStrategy } from '../../../../common/data_streams';

export interface DefaultIntegrationsContext {
  cache: IImmutableCache<FindIntegrationsRequestQuery, FindIntegrationsResponse>;
  integrationsSource: Integration[] | null;
  integrations: Integration[] | null;
  error: Error | null;
  search: FindIntegrationsRequestQuery & { strategy?: SearchStrategy };
  total?: number;
}

export interface IntegrationsSearchParams {
  nameQuery?: string;
  sortOrder?: SortOrder;
  strategy?: SearchStrategy;
  integrationId?: string;
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
      value: 'searchingStreams';
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
