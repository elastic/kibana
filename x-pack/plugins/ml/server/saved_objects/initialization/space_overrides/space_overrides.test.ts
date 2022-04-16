/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { createJobSpaceOverrides } from './space_overrides';

const jobs = [
  {
    job_id: 'kibana-logs-ui-default-default-log-entry-rate',
  },
  {
    job_id: 'kibana-logs-ui-other_space-default-log-entry-rate',
  },
  {
    job_id: 'kibana-logs-ui-other_space-default-log-entry-categories-count',
  },
  {
    job_id: 'kibana-logs-ui-other_space-internal-stack-monitoring-log-entry-rate',
  },
  {
    job_id: 'kibana-logs-ui-other_space-dinosaur-log-entry-rate', // shouldn't match
  },
  {
    job_id: 'kibana-logs-ui-other_space-default-dinosaur', // shouldn't match
  },
  {
    job_id: 'kibana-metrics-ui-default-default-k8s_memory_usage',
  },
  {
    job_id: 'kibana-metrics-ui-other_space-default-hosts_network_in',
  },
];

const result = {
  overrides: {
    'anomaly-detector': {
      'kibana-logs-ui-default-default-log-entry-rate': ['default'],
      'kibana-logs-ui-other_space-default-log-entry-rate': ['other_space'],
      'kibana-logs-ui-other_space-default-log-entry-categories-count': ['other_space'],
      'kibana-logs-ui-other_space-internal-stack-monitoring-log-entry-rate': ['other_space'],
      'kibana-metrics-ui-default-default-k8s_memory_usage': ['default'],
      'kibana-metrics-ui-other_space-default-hosts_network_in': ['other_space'],
    },
    'data-frame-analytics': {},
  },
};

const callAs = {
  ml: {
    getJobs: jest.fn(() => Promise.resolve({ jobs })),
  },
};

const mlClusterClient = {
  asInternalUser: callAs,
} as unknown as IScopedClusterClient;

describe('ML - job initialization', () => {
  describe('createJobSpaceOverrides', () => {
    it('should apply job overrides correctly', async () => {
      const overrides = await createJobSpaceOverrides(mlClusterClient);
      expect(overrides).toEqual(result);
    });
  });
});
