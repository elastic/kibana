/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DoneInvokeEvent } from 'xstate';
import type { IHashedCache } from '../../../../common/hashed_cache';
import { SortOrder, SearchAfter, FindIntegrationsValue } from '../../../../common/latest';
import { Integration } from '../../../../common/datasets';

export interface IntegrationsSearchParams {
  nameQuery?: string;
  searchAfter?: SearchAfter;
  sortOrder?: SortOrder;
  integrationId?: string;
}

export interface WithCache {
  cache: IHashedCache<IntegrationsSearchParams, FindIntegrationsValue>;
}

export interface WithSearch {
  search: IntegrationsSearchParams;
}

export interface WithIntegrations {
  integrationsSource: Integration[];
  integrations: Integration[];
}

export interface WithNullishIntegrations {
  integrationsSource: null;
  integrations: null;
}

export interface WithError {
  error: Error;
}

export interface WithNullishError {
  error: null;
}

export interface WithTotal {
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
  WithNullishIntegrations &
  Partial<WithTotal> &
  WithSearch &
  WithError;

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
      value: 'loadingFailed';
      context: LoadingFailedIntegrationsContext;
    }
  | {
      value: 'loaded';
      context: LoadedIntegrationsContext;
    }
  | {
      value: { loaded: 'idle' };
      context: LoadedIntegrationsContext;
    }
  | {
      value: { loaded: 'loadingMore' };
      context: LoadedIntegrationsContext;
    }
  | {
      value: { loaded: 'debounceSearchingIntegrations' };
      context: LoadedIntegrationsContext;
    };

export type IntegrationsContext = IntegrationTypestate['context'];

export type IntegrationsEvent =
  | {
      type: 'LOAD_MORE_INTEGRATIONS';
    }
  | {
      type: 'RELOAD_INTEGRATIONS';
    }
  | {
      type: 'SEARCH_INTEGRATIONS';
      search: IntegrationsSearchParams;
    }
  | {
      type: 'SORT_INTEGRATIONS';
      search: IntegrationsSearchParams;
    }
  | DoneInvokeEvent<FindIntegrationsValue | Error>;
