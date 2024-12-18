/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { AlertsGroupingProps } from '../types';

export const mockGroupingId = 'test';

export const mockRuleTypeIds = ['.es-query'];
export const mockConsumers = ['stackAlerts'];

export const mockDate = {
  from: '2020-07-07T08:20:18.966Z',
  to: '2020-07-08T08:20:18.966Z',
};

export const mockOptions = [
  { label: 'ruleName', key: 'kibana.alert.rule.name' },
  { label: 'userName', key: 'user.name' },
  { label: 'hostName', key: 'host.name' },
  { label: 'sourceIP', key: 'source.ip' },
];

export const mockGroupingProps: Omit<AlertsGroupingProps, 'children'> = {
  ...mockDate,
  groupingId: mockGroupingId,
  ruleTypeIds: mockRuleTypeIds,
  consumers: mockConsumers,
  defaultGroupingOptions: mockOptions,
  getAggregationsByGroupingField: () => [],
  getGroupStats: () => [{ title: 'Stat', component: <span /> }],
  renderGroupPanel: () => <span />,
  takeActionItems: undefined,
  defaultFilters: [],
  globalFilters: [],
  globalQuery: {
    query: 'query',
    language: 'language',
  },
  loading: false,
  services: {
    dataViews: {
      clearInstanceCache: jest.fn(),
      create: jest.fn(),
    } as unknown as AlertsGroupingProps['services']['dataViews'],
    http: {
      get: jest.fn(),
    } as unknown as AlertsGroupingProps['services']['http'],
    notifications: {
      toasts: {
        addDanger: jest.fn(),
      },
    } as unknown as AlertsGroupingProps['services']['notifications'],
  },
};
