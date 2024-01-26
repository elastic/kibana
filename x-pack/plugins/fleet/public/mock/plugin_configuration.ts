/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetConfigType } from '../plugin';

export const createConfigurationMock = (): FleetConfigType => {
  return {
    enabled: true,
    registryUrl: '',
    registryProxyUrl: '',
    agentIdVerificationEnabled: true,
    agents: {
      enabled: true,
      elasticsearch: {
        hosts: [''],
        ca_sha256: '',
        ca_trusted_fingerprint: '',
      },
    },
  };
};
