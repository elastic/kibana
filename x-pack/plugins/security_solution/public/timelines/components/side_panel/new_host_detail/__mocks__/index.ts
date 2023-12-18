/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObservedEntityData } from '../../../../../flyout/entity_details/shared/observed_entity/types';
import type { HostItem } from '../../../../../../common/search_strategy';
import { RiskSeverity } from '../../../../../../common/search_strategy';

const hostRiskScore = {
  '@timestamp': '123456',
  host: {
    name: 'test',
    risk: {
      rule_risks: [],
      calculated_score_norm: 70,
      multipliers: [],
      calculated_level: RiskSeverity.high,
    },
  },
  alertsCount: 0,
  oldestAlertTimestamp: '123456',
};

export const mockRiskScoreState = {
  data: [hostRiskScore],
  inspect: {
    dsl: [],
    response: [],
  },
  isInspected: false,
  refetch: () => {},
  totalCount: 0,
  isModuleEnabled: true,
  isAuthorized: true,
  isDeprecated: false,
  loading: false,
};

export const mockObservedHost = {
  // ...
  // user: {
  //   id: ['1234', '321'],
  //   domain: ['test domain', 'another test domain'],
  // },
  // host: {
  //   ip: ['10.0.0.1', '127.0.0.1'],
  //   os: {
  //     name: ['testOs'],
  //     family: ['testFamily'],
  //   },
  // },
};

export const mockObservedHostData: ObservedEntityData<HostItem> = {
  details: mockObservedHost,
  isLoading: false,
  firstSeen: {
    isLoading: false,
    date: '2023-02-23T20:03:17.489Z',
  },
  lastSeen: {
    isLoading: false,
    date: '2023-02-23T20:03:17.489Z',
  },
  anomalies: { isLoading: false, anomalies: null, jobNameById: {} },
};
