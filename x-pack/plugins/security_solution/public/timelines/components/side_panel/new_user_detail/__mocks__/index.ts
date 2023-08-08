/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskSeverity } from '../../../../../../common/search_strategy';
import { mockAnomalies } from '../../../../../common/components/ml/mock';
import type { ObservedUserData } from '../types';

const userRiskScore = {
  '@timestamp': '123456',
  user: {
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
  data: [userRiskScore],
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

const anomaly = mockAnomalies.anomalies[0];

export const managedUserDetails = {
  '@timestamp': '',
  agent: {},
  host: {},
  event: {},
  user: {
    id: '123456',
    last_name: 'user',
    first_name: 'test',
    full_name: 'test user',
    phone: ['123456', '654321'],
  },
};

export const observedUserDetails = {
  user: {
    id: ['1234', '321'],
    domain: ['test domain', 'another test domain'],
  },
  host: {
    ip: ['10.0.0.1', '127.0.0.1'],
    os: {
      name: ['testOs'],
      family: ['testFamily'],
    },
  },
};

export const mockManagedUser = {
  details: managedUserDetails,
  isLoading: false,
  isIntegrationEnabled: true,
  firstSeen: {
    isLoading: false,
    date: '2023-03-23T20:03:17.489Z',
  },
  lastSeen: {
    isLoading: false,
    date: '2023-03-23T20:03:17.489Z',
  },
};

export const mockObservedUser: ObservedUserData = {
  details: observedUserDetails,
  isLoading: false,
  firstSeen: {
    isLoading: false,
    date: '2023-02-23T20:03:17.489Z',
  },
  lastSeen: {
    isLoading: false,
    date: '2023-02-23T20:03:17.489Z',
  },
  anomalies: {
    isLoading: false,
    anomalies: {
      anomalies: [anomaly],
      interval: '',
    },
    jobNameById: { [anomaly.jobId]: 'job_name' },
  },
};
