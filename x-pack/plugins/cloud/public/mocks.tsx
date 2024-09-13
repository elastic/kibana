/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';

import type { CloudSetup, CloudStart } from './types';

function createSetupMock(): jest.Mocked<CloudSetup> {
  return {
    cloudId: 'mock-cloud-id',
    deploymentId: 'mock-deployment-id',
    isCloudEnabled: true,
    cname: 'cname',
    baseUrl: 'base-url',
    deploymentUrl: 'deployment-url',
    profileUrl: 'profile-url',
    organizationUrl: 'organization-url',
    fetchElasticsearchConfig: () => new Promise(() => ({ elasticsearchUrl: 'elasticsearch-url' })),
    kibanaUrl: 'kibana-url',
    cloudHost: 'cloud-host',
    cloudDefaultPort: '443',
    isElasticStaffOwned: true,
    trialEndDate: new Date('2020-10-01T14:13:12Z'),
    registerCloudService: jest.fn(),
    onboarding: {},
    isServerlessEnabled: false,
    serverless: {
      projectId: undefined,
      projectName: undefined,
      projectType: undefined,
    },
  };
}

const getContextProvider: () => FC<PropsWithChildren<unknown>> =
  () =>
  ({ children }) =>
    <>{children}</>;

const createStartMock = (): jest.Mocked<CloudStart> => ({
  CloudContextProvider: jest.fn(getContextProvider()),
  cloudId: 'mock-cloud-id',
  isCloudEnabled: true,
  deploymentUrl: 'deployment-url',
  billingUrl: 'billing-url',
  profileUrl: 'profile-url',
  organizationUrl: 'organization-url',
  isServerlessEnabled: false,
  serverless: {
    projectId: undefined,
  },
  fetchElasticsearchConfig: jest.fn(
    () => new Promise(() => ({ elasticsearchUrl: 'elasticsearch-url' }))
  ),
});

export const cloudMock = {
  createSetup: createSetupMock,
  createStart: createStartMock,
};
