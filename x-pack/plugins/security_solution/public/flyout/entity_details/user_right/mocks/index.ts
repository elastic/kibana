/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockAnomalies } from '../../../../common/components/ml/mock';
import type { UserItem } from '../../../../../common/search_strategy';
import type { ObservedEntityData } from '../../shared/components/observed_entity/types';

const anomaly = mockAnomalies.anomalies[0];

const observedUserDetails = {
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

export const mockObservedUser: ObservedEntityData<UserItem> = {
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
