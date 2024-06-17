/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HostMetadataInterface } from '../../../../common/endpoint/types';
import { EndpointStatus, HostStatus } from '../../../../common/endpoint/types';
import type { RiskScoreState } from '../../../entity_analytics/api/hooks/use_risk_score';
import type {
  HostItem,
  HostRiskScore,
  RiskScoreEntity,
  UserRiskScore,
} from '../../../../common/search_strategy';
import { HostPolicyResponseActionStatus, RiskSeverity } from '../../../../common/search_strategy';
import { RiskCategories } from '../../../../common/entity_analytics/risk_engine';
import type { ObservedEntityData } from '../shared/components/observed_entity/types';

const userRiskScore: UserRiskScore = {
  '@timestamp': '1989-11-08T23:00:00.000Z',
  user: {
    name: 'test',
    risk: {
      rule_risks: [],
      calculated_score_norm: 70,
      multipliers: [],
      calculated_level: RiskSeverity.High,
      '@timestamp': '',
      id_field: '',
      id_value: '',
      calculated_score: 0,
      category_1_count: 5,
      category_1_score: 20,
      category_2_count: 1,
      category_2_score: 10,
      notes: [],
      inputs: [
        {
          id: '_id',
          index: '_index',
          category: RiskCategories.category_1,
          description: 'Alert from Rule: My rule',
          risk_score: 30,
          timestamp: '2021-08-19T18:55:59.000Z',
        },
      ],
    },
  },
  alertsCount: 0,
  oldestAlertTimestamp: '1989-11-08T23:00:00.000Z',
};

const hostRiskScore: HostRiskScore = {
  '@timestamp': '1989-11-08T23:00:00.000Z',
  host: {
    name: 'test',
    risk: {
      rule_risks: [],
      calculated_score_norm: 70,
      multipliers: [],
      calculated_level: RiskSeverity.High,
      '@timestamp': '',
      id_field: '',
      id_value: '',
      calculated_score: 0,
      category_1_count: 5,
      category_1_score: 20,
      category_2_count: 1,
      category_2_score: 10,
      notes: [],
      inputs: [
        {
          id: '_id',
          index: '_index',
          category: RiskCategories.category_1,
          description: 'Alert from Rule: My rule',
          risk_score: 30,
          timestamp: '2021-08-19T18:55:59.000Z',
        },
      ],
    },
  },
  alertsCount: 0,
  oldestAlertTimestamp: '1989-11-08T23:00:00.000Z',
};

export const mockUserRiskScoreState: RiskScoreState<RiskScoreEntity.user> = {
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
  error: undefined,
};

export const mockHostRiskScoreState: RiskScoreState<RiskScoreEntity.host> = {
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
  error: undefined,
};

const hostMetadata: HostMetadataInterface = {
  '@timestamp': 1036358673463478,

  agent: {
    id: 'endpoint-agent-id',
    version: 'endpoint-agent-version',
    type: 'endpoint-agent-type',
  },
  Endpoint: {
    status: EndpointStatus.enrolled,
    policy: {
      applied: {
        name: 'policy-name',
        id: 'C2A9093E-E289-4C0A-AA44-8C32A414FA7A',
        endpoint_policy_version: 3,
        version: 5,
        status: HostPolicyResponseActionStatus.failure,
      },
    },
  },
} as HostMetadataInterface;

export const mockObservedHost: HostItem = {
  host: {
    id: ['host-id'],
    mac: ['host-mac'],
    architecture: ['host-architecture'],
    os: {
      platform: ['host-platform'],
      name: ['os-name'],
      version: ['host-version'],
      family: ['host-family'],
    },
    ip: ['host-ip'],
    name: ['host-name'],
  },
  cloud: {
    instance: {
      id: ['cloud-instance-id'],
    },
    provider: ['cloud-provider'],
    region: ['cloud-region'],
    machine: {
      type: ['cloud-machine-type'],
    },
  },
  endpoint: {
    hostInfo: {
      metadata: hostMetadata,
      host_status: HostStatus.HEALTHY,
      last_checkin: 'host-last-checkin',
    },
  },
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
