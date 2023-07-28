/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from './plugin';

function createSetupMock(): jest.Mocked<CloudSetup> {
  return {
    cloudId: 'mock-cloud-id',
    deploymentId: 'deployment-id',
    elasticsearchUrl: 'elasticsearch-url',
    kibanaUrl: 'kibana-url',
    cloudHost: 'cloud-host',
    cloudDefaultPort: '443',
    instanceSizeMb: 1234,
    isCloudEnabled: true,
    isElasticStaffOwned: true,
    trialEndDate: new Date('2020-10-01T14:13:12Z'),
    apm: {
      url: undefined,
      secretToken: undefined,
    },
    isServerlessEnabled: false,
    serverless: {
      projectId: undefined,
    },
  };
}

export const cloudMock = {
  createSetup: createSetupMock,
};
