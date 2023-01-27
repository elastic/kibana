/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryOperator } from '../../../../../common/types/timeline';

export const hostFilter = {
  field: 'host.hostname',
  value: 'Host-u6ou715rzy',
};

export const ANDFilterGroup1 = [
  hostFilter,
  { field: 'kibana.alerts.workflow_status', value: 'open' },
];

const ANDFilterGroup2 = [hostFilter, { field: 'kibana.alerts.workflow_status', value: 'closed' }];

const ANDFilterGroup3 = [
  hostFilter,
  { field: 'kibana.alerts.workflow_status', value: 'acknowledged' },
];

export const ORFilterGroup = [ANDFilterGroup1, ANDFilterGroup2, ANDFilterGroup3];

export const dataProviderWithOneFilter = [
  {
    and: [],
    enabled: true,
    id: 'mock-id',
    name: 'host.hostname',
    excluded: false,
    kqlQuery: '',
    queryMatch: {
      field: 'host.hostname',
      value: 'Host-u6ou715rzy',
      displayValue: 'Host-u6ou715rzy',
      operator: ':' as QueryOperator,
    },
  },
];

export const dataProviderWithAndFilters = [
  {
    and: [
      {
        and: [],
        enabled: true,
        excluded: false,
        id: 'mock-id',
        kqlQuery: '',
        name: 'kibana.alerts.workflow_status',
        queryMatch: {
          field: 'kibana.alerts.workflow_status',
          operator: ':' as QueryOperator,
          value: 'open',
          displayValue: 'open',
        },
      },
    ],

    enabled: true,
    id: 'mock-id',
    name: 'host.hostname',
    excluded: false,
    kqlQuery: '',
    queryMatch: {
      field: 'host.hostname',
      value: 'Host-u6ou715rzy',
      displayValue: 'Host-u6ou715rzy',
      operator: ':' as QueryOperator,
    },
  },
];

export const dataProviderWithOrFilters = [
  {
    and: [
      {
        and: [],
        enabled: true,
        id: 'mock-id',
        name: 'kibana.alerts.workflow_status',
        excluded: false,
        kqlQuery: '',
        queryMatch: {
          field: 'kibana.alerts.workflow_status',
          value: 'open',
          displayValue: 'open',
          operator: ':' as QueryOperator,
        },
      },
    ],
    enabled: true,
    id: 'mock-id',
    name: 'host.hostname',
    excluded: false,
    kqlQuery: '',
    queryMatch: {
      field: 'host.hostname',
      value: 'Host-u6ou715rzy',
      displayValue: 'Host-u6ou715rzy',
      operator: ':' as QueryOperator,
    },
  },
  {
    and: [
      {
        and: [],
        enabled: true,
        id: 'mock-id',
        name: 'kibana.alerts.workflow_status',
        excluded: false,
        kqlQuery: '',
        queryMatch: {
          field: 'kibana.alerts.workflow_status',
          value: 'closed',
          displayValue: 'closed',
          operator: ':' as QueryOperator,
        },
      },
    ],
    enabled: true,
    id: 'mock-id',
    name: 'host.hostname',
    excluded: false,
    kqlQuery: '',
    queryMatch: {
      field: 'host.hostname',
      value: 'Host-u6ou715rzy',
      displayValue: 'Host-u6ou715rzy',
      operator: ':' as QueryOperator,
    },
  },
  {
    and: [
      {
        and: [],
        enabled: true,
        id: 'mock-id',
        name: 'kibana.alerts.workflow_status',
        excluded: false,
        kqlQuery: '',
        queryMatch: {
          field: 'kibana.alerts.workflow_status',
          value: 'acknowledged',
          displayValue: 'acknowledged',
          operator: ':' as QueryOperator,
        },
      },
    ],
    enabled: true,
    id: 'mock-id',
    name: 'host.hostname',
    excluded: false,
    kqlQuery: '',
    queryMatch: {
      field: 'host.hostname',
      value: 'Host-u6ou715rzy',
      displayValue: 'Host-u6ou715rzy',
      operator: ':' as QueryOperator,
    },
  },
];
