/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FleetConfigType } from '../../../plugin';

export const createConfigurationMock = (): FleetConfigType => {
  return {
    enabled: true,
    registryUrl: '',
    registryProxyUrl: '',
    agents: {
      enabled: true,
      fleetServerEnabled: false,
      tlsCheckDisabled: true,
      pollingRequestTimeout: 1000,
      maxConcurrentConnections: 100,
      kibana: {
        host: '',
        ca_sha256: '',
      },
      elasticsearch: {
        host: '',
        ca_sha256: '',
      },
      agentPolicyRolloutRateLimitIntervalMs: 100,
      agentPolicyRolloutRateLimitRequestPerInterval: 1000,
    },
  };
};
