/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import querystring from 'querystring';
import { createSelector } from 'reselect';
import { Immutable, HostPolicyResponseActions } from '../../../../../common/types';
import { HostState, HostIndexUIQueryParams } from '../../types';

const PAGE_SIZES = Object.freeze([10, 20, 50]);

export const listData = (state: Immutable<HostState>) => state.hosts;

export const pageIndex = (state: Immutable<HostState>): number => state.pageIndex;

export const pageSize = (state: Immutable<HostState>): number => state.pageSize;

export const totalHits = (state: Immutable<HostState>): number => state.total;

export const listLoading = (state: Immutable<HostState>): boolean => state.loading;

export const listError = (state: Immutable<HostState>) => state.error;

export const detailsData = (state: Immutable<HostState>) => state.details;

export const detailsLoading = (state: Immutable<HostState>): boolean => state.detailsLoading;

export const detailsError = (state: Immutable<HostState>) => state.detailsError;

const detailsPolicyResponse = () => {
  const response = {
    '@timestamp': 'a formatted timestamp',
    elastic: {
      agent: {},
    },
    ecs: {
      version: '1.0.0',
    },
    event: {
      created: '2015-01-01T12:10:30Z',
      kind: 'policy_response',
    },
    agent: {
      version: '6.0.0-rc2',
      id: '8a4f500d',
    },
    endpoint: {
      artifacts: {
        'global-manifest': {
          version: '1.2.3',
          sha256: 'abcdef',
        },
        'endpointpe-v4-windows': {
          version: '1.2.3',
          sha256: 'abcdef',
        },
        'user-whitelist-windows': {
          version: '1.2.3',
          sha256: 'abcdef',
        },
        'global-whitelist-windows': {
          version: '1.2.3',
          sha256: 'abcdef',
        },
      },
      policy: {
        version: '1.0.0',
        id: '17d4b81d-9940-4b64-9de5-3e03ef1fb5cf',
        response: {
          configurations: {
            malware: {
              status: 'success',
              concerned_actions: ['download_model'],
            },
            eventing: {
              status: 'failure',
              concerned_actions: ['ingest_events_config'],
            },
          },
          actions: {
            download_model: {
              status: 'success',
              message: 'model downloaded',
            },
            ingest_events_config: {
              status: 'failure',
              message: 'no action taken',
            },
          },
        },
      },
    },
  };
  return response.endpoint.policy.response;
};

export const policyResponseConfigurations = createSelector(detailsPolicyResponse, response => {
  return response.configurations;
});

export const policyResponseActions: HostPolicyResponseActions = createSelector(
  detailsPolicyResponse,
  response => {
    return response.actions;
  }
);

export const isOnHostPage = (state: Immutable<HostState>) =>
  state.location ? state.location.pathname === '/hosts' : false;

export const uiQueryParams: (
  state: Immutable<HostState>
) => Immutable<HostIndexUIQueryParams> = createSelector(
  (state: Immutable<HostState>) => state.location,
  (location: Immutable<HostState>['location']) => {
    const data: HostIndexUIQueryParams = { page_index: '0', page_size: '10' };
    if (location) {
      // Removes the `?` from the beginning of query string if it exists
      const query = querystring.parse(location.search.slice(1));

      const keys: Array<keyof HostIndexUIQueryParams> = [
        'selected_host',
        'page_size',
        'page_index',
        'show',
      ];

      for (const key of keys) {
        const value = query[key];
        if (typeof value === 'string') {
          data[key] = value;
        } else if (Array.isArray(value)) {
          data[key] = value[value.length - 1];
        }
      }

      // Check if page size is an expected size, otherwise default to 10
      if (!PAGE_SIZES.includes(Number(data.page_size))) {
        data.page_size = '10';
      }

      // Check if page index is a valid positive integer, otherwise default to 0
      const pageIndexAsNumber = Number(data.page_index);
      if (!Number.isFinite(pageIndexAsNumber) || pageIndexAsNumber < 0) {
        data.page_index = '0';
      }
    }
    return data;
  }
);

export const hasSelectedHost: (state: Immutable<HostState>) => boolean = createSelector(
  uiQueryParams,
  ({ selected_host: selectedHost }) => {
    return selectedHost !== undefined;
  }
);

/** What policy details panel view to show */
export const showView: (state: HostState) => 'policy_response' | 'details' = createSelector(
  uiQueryParams,
  searchParams => {
    return searchParams.show === 'policy_response' ? 'policy_response' : 'details';
  }
);

/**
 * Returns the Policy Response overall status
 */
export const policyResponseStatus: (state: Immutable<HostState>) => string = createSelector(
  state => state.policyResponse,
  policyResponse => {
    return (policyResponse && policyResponse?.endpoint?.policy?.applied?.status) || '';
  }
);
