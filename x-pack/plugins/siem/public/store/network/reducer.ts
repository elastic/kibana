/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import {
  Direction,
  DomainsFields,
  FlowDirection,
  FlowTarget,
  NetworkDnsFields,
  NetworkTopNFlowFields,
} from '../../graphql/types';
import { DEFAULT_TABLE_LIMIT } from '../constants';

import {
  applyNetworkFilterQuery,
  setNetworkFilterQueryDraft,
  updateDnsLimit,
  updateDnsSort,
  updateDomainsFlowDirection,
  updateDomainsFlowTarget,
  updateDomainsLimit,
  updateDomainsSort,
  updateIpOverviewFlowTarget,
  updateIsPtrIncluded,
  updateTopNFlowDirection,
  updateTopNFlowLimit,
  updateTopNFlowSort,
  updateTopNFlowTarget,
} from './actions';
import { helperUpdateTopNFlowDirection } from './helper';
import { NetworkModel, NetworkType } from './model';

export type NetworkState = NetworkModel;

export const initialNetworkState: NetworkState = {
  page: {
    queries: {
      topNFlow: {
        limit: DEFAULT_TABLE_LIMIT,
        topNFlowSort: {
          field: NetworkTopNFlowFields.bytes,
          direction: Direction.desc,
        },
        flowTarget: FlowTarget.source,
        flowDirection: FlowDirection.uniDirectional,
      },
      dns: {
        limit: DEFAULT_TABLE_LIMIT,
        dnsSortField: {
          field: NetworkDnsFields.uniqueDomains,
          direction: Direction.desc,
        },
        isPtrIncluded: false,
      },
    },
    filterQuery: null,
    filterQueryDraft: null,
  },
  details: {
    queries: {
      ipOverview: {
        flowTarget: FlowTarget.source,
      },
      domains: {
        flowDirection: FlowDirection.uniDirectional,
        flowTarget: FlowTarget.source,
        limit: DEFAULT_TABLE_LIMIT,
        domainsSortField: {
          field: DomainsFields.domainName,
          direction: Direction.desc,
        },
      },
    },
    filterQuery: null,
    filterQueryDraft: null,
  },
};

export const networkReducer = reducerWithInitialState(initialNetworkState)
  .case(updateDnsLimit, (state, { limit, networkType }) => ({
    ...state,
    [networkType]: {
      ...state[networkType],
      queries: {
        ...state[networkType].queries,
        dns: {
          ...state[NetworkType.page].queries.dns,
          limit,
        },
      },
    },
  }))
  .case(updateDnsSort, (state, { dnsSortField, networkType }) => ({
    ...state,
    [networkType]: {
      ...state[networkType],
      queries: {
        ...state[networkType].queries,
        dns: {
          ...state[NetworkType.page].queries.dns,
          dnsSortField,
        },
      },
    },
  }))
  .case(updateIsPtrIncluded, (state, { isPtrIncluded, networkType }) => ({
    ...state,
    [networkType]: {
      ...state[networkType],
      queries: {
        ...state[networkType].queries,
        dns: {
          ...state[NetworkType.page].queries.dns,
          isPtrIncluded,
        },
      },
    },
  }))
  .case(updateTopNFlowLimit, (state, { limit, networkType }) => ({
    ...state,
    [networkType]: {
      ...state[networkType],
      queries: {
        ...state[networkType].queries,
        topNFlow: {
          ...state[NetworkType.page].queries.topNFlow,
          limit,
        },
      },
    },
  }))
  .case(updateTopNFlowDirection, (state, { flowDirection, networkType }) => ({
    ...state,
    [networkType]: {
      ...state[networkType],
      queries: {
        ...state[networkType].queries,
        topNFlow: {
          ...state[NetworkType.page].queries.topNFlow,
          ...helperUpdateTopNFlowDirection(
            state[NetworkType.page].queries.topNFlow.flowTarget,
            flowDirection
          ),
        },
      },
    },
  }))
  .case(updateTopNFlowSort, (state, { topNFlowSort, networkType }) => ({
    ...state,
    [networkType]: {
      ...state[networkType],
      queries: {
        ...state[networkType].queries,
        topNFlow: {
          ...state[NetworkType.page].queries.topNFlow,
          topNFlowSort,
        },
      },
    },
  }))
  .case(updateTopNFlowTarget, (state, { flowTarget, networkType }) => ({
    ...state,
    [networkType]: {
      ...state[networkType],
      queries: {
        ...state[networkType].queries,
        topNFlow: {
          ...state[NetworkType.page].queries.topNFlow,
          flowTarget,
          topNFlowSort: {
            field: NetworkTopNFlowFields.bytes,
            direction: Direction.desc,
          },
        },
      },
    },
  }))
  .case(setNetworkFilterQueryDraft, (state, { filterQueryDraft, networkType }) => ({
    ...state,
    [networkType]: {
      ...state[networkType],
      filterQueryDraft,
    },
  }))
  .case(applyNetworkFilterQuery, (state, { filterQuery, networkType }) => ({
    ...state,
    [networkType]: {
      ...state[networkType],
      filterQueryDraft: filterQuery.query,
      filterQuery,
    },
  }))
  .case(updateIpOverviewFlowTarget, (state, { flowTarget }) => ({
    ...state,
    [NetworkType.details]: {
      ...state[NetworkType.details],
      queries: {
        ...state[NetworkType.details].queries,
        ipOverview: {
          ...state[NetworkType.details].queries.ipOverview,
          flowTarget,
        },
      },
    },
  }))
  .case(updateDomainsLimit, (state, { limit }) => ({
    ...state,
    [NetworkType.details]: {
      ...state[NetworkType.details],
      queries: {
        ...state[NetworkType.details].queries,
        domains: {
          ...state[NetworkType.details].queries.domains,
          limit,
        },
      },
    },
  }))
  .case(updateDomainsFlowDirection, (state, { flowDirection }) => ({
    ...state,
    [NetworkType.details]: {
      ...state[NetworkType.details],
      queries: {
        ...state[NetworkType.details].queries,
        domains: {
          ...state[NetworkType.details].queries.domains,
          flowDirection,
        },
      },
    },
  }))
  .case(updateDomainsSort, (state, { domainsSortField }) => ({
    ...state,
    [NetworkType.details]: {
      ...state[NetworkType.details],
      queries: {
        ...state[NetworkType.details].queries,
        domains: {
          ...state[NetworkType.details].queries.domains,
          domainsSortField,
        },
      },
    },
  }))
  .case(updateDomainsFlowTarget, (state, { flowTarget }) => ({
    ...state,
    [NetworkType.details]: {
      ...state[NetworkType.details],
      queries: {
        ...state[NetworkType.details].queries,
        domains: {
          ...state[NetworkType.details].queries.domains,
          flowTarget,
        },
      },
    },
  }))
  .build();
