/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { CloudStart } from '.';
import { ServicesProvider } from './services';

function createSetupMock() {
  return {
    cloudId: 'mock-cloud-id',
    isCloudEnabled: true,
    cname: 'cname',
    baseUrl: 'base-url',
    deploymentUrl: 'deployment-url',
    profileUrl: 'profile-url',
    organizationUrl: 'organization-url',
  };
}

const config = {
  chat: {
    enabled: true,
    chatURL: 'chat-url',
    user: {
      id: 'user-id',
      email: 'test-user@elastic.co',
      jwt: 'identity-jwt',
    },
  },
};

const getContextProvider: () => React.FC =
  () =>
  ({ children }) =>
    <ServicesProvider {...config}>{children}</ServicesProvider>;

const createStartMock = (): jest.Mocked<CloudStart> => ({
  CloudContextProvider: jest.fn(getContextProvider()),
});

export const cloudMock = {
  createSetup: createSetupMock,
  createStart: createStartMock,
};
