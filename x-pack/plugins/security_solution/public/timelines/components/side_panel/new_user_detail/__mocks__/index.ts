/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EntraManagedUser,
  ManagedUser,
  OktaManagedUser,
} from '../../../../../../common/search_strategy/security_solution/users/managed_details';
import { ManagedUserDatasetKey } from '../../../../../../common/search_strategy/security_solution/users/managed_details';
import { RiskSeverity } from '../../../../../../common/search_strategy';
import { mockAnomalies } from '../../../../../common/components/ml/mock';
import type { ManagedUserData, ObservedUserData } from '../types';

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

export const mockOktaUser: OktaManagedUser = {
  '@timestamp': '2023-11-16T13:42:23.074Z',
  agent: {},
  event: {
    dataset: ManagedUserDatasetKey.OKTA,
  },
  user: {
    profile: {
      last_name: 'User',
      first_name: 'Test',
      mobile_phone: '123456',
      job_title: 'Unit tester',
    },
    geo: {
      city_name: "A'dam",
      country_iso_code: 'NL',
    },
    name: 'test.user@elastic.co',
    id: '00ud9ohoh9ww644Px5d7',
    email: 'test.user@elastic.co',
  },
};

export const mockEntraUser: EntraManagedUser = {
  '@timestamp': '1989-03-07T20:00:00.000Z',
  agent: {},
  host: {},
  event: {
    dataset: ManagedUserDatasetKey.ENTRA,
  },
  user: {
    id: '123456',
    last_name: 'User',
    first_name: 'Test',
    full_name: 'test user',
    phone: '123456',
    job_title: 'Unit tester',
    work: {
      location_name: 'USA, CA',
    },
  },
};

export const managedUserDetails: ManagedUser = {
  [ManagedUserDatasetKey.ENTRA]: mockEntraUser,
  [ManagedUserDatasetKey.OKTA]: undefined,
};

export const mockManagedUserData: ManagedUserData = {
  details: managedUserDetails,
  isLoading: false,
  isIntegrationEnabled: true,
};
