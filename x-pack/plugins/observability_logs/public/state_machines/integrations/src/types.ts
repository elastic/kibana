/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PageAfter } from '../../../../common/latest';
import { Integration } from '../../../../common/integrations';

export interface DefaultIntegrationsContext {
  integrations: Integration[];
  error: Error | null;
  page: PageAfter;
}

export interface IntegrationsSearchParams {
  name: string;
  sortDirection: 'asc' | 'desc';
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
    };

export type IntegrationsContext = IntegrationTypestate['context'];

export type IntegrationsEvent =
  | {
      type: 'LOADING_SUCCEEDED';
      integrations: Integration[];
      page?: PageAfter;
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
