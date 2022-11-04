/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';

import { CloudStart } from '.';

function createSetupMock() {
  return {
    cloudId: 'mock-cloud-id',
    isCloudEnabled: true,
    cname: 'cname',
    baseUrl: 'base-url',
    deploymentUrl: 'deployment-url',
    profileUrl: 'profile-url',
    organizationUrl: 'organization-url',
    isElasticStaffOwned: true,
    organizationCreatedAt: new Date('2019-10-01T14:13:12Z'),
    trialEndDate: new Date('2020-10-01T14:13:12Z'),
    inTrial$: new BehaviorSubject<boolean>(true),
    isPaying$: new BehaviorSubject<boolean>(false),
    registerCloudService: jest.fn(),
  };
}

const getContextProvider: () => React.FC =
  () =>
  ({ children }) =>
    <>{children}</>;

const createStartMock = (): jest.Mocked<CloudStart> => ({
  CloudContextProvider: jest.fn(getContextProvider()),
  cloudId: 'mock-cloud-id',
  isCloudEnabled: true,
  deploymentUrl: 'deployment-url',
  profileUrl: 'profile-url',
  organizationUrl: 'organization-url',
});

export const cloudMock = {
  createSetup: createSetupMock,
  createStart: createStartMock,
};
