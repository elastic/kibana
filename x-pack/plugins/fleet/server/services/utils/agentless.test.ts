/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { securityMock } from '@kbn/security-plugin/server/mocks';

import { appContextService } from '../app_context';

import {
  isAgentlessCloudEnabled,
  isAgentlessEnabled,
  isAgentlessServerlessEnabled,
} from './agentless';

jest.mock('../app_context');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
mockedAppContextService.getSecuritySetup.mockImplementation(() => ({
  ...securityMock.createSetup(),
}));

describe('isAgentlessCloudEnabled', () => {
  it('should return false if cloud is not enabled', () => {
    jest
      .spyOn(appContextService, 'getExperimentalFeatures')
      .mockReturnValue({ agentless: false } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: false } as any);

    expect(isAgentlessCloudEnabled()).toBe(false);
  });

  it('should return false if cloud is enabled but agentless is not', () => {
    jest
      .spyOn(appContextService, 'getExperimentalFeatures')
      .mockReturnValue({ agentless: false } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);

    expect(isAgentlessCloudEnabled()).toBe(false);
  });

  it('should return true if cloud is enabled and agentless is enabled', () => {
    jest
      .spyOn(appContextService, 'getExperimentalFeatures')
      .mockReturnValue({ agentless: true } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);

    expect(isAgentlessCloudEnabled()).toBe(true);
  });
});

describe('isAgentlessServerlessEnabled', () => {
  it('should return false if serverless is not enabled', () => {
    jest
      .spyOn(appContextService, 'getExperimentalFeatures')
      .mockReturnValue({ agentless: false } as any);
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isServerlessEnabled: false } as any);

    expect(isAgentlessServerlessEnabled()).toBe(false);
  });

  it('should return false if serverless is enabled but agentless is not', () => {
    jest
      .spyOn(appContextService, 'getExperimentalFeatures')
      .mockReturnValue({ agentless: false } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isServerlessEnabled: true } as any);

    expect(isAgentlessServerlessEnabled()).toBe(false);
  });

  it('should return true if serverless is enabled and agentless is enabled', () => {
    jest
      .spyOn(appContextService, 'getExperimentalFeatures')
      .mockReturnValue({ agentless: true } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isServerlessEnabled: true } as any);

    expect(isAgentlessServerlessEnabled()).toBe(true);
  });
});

describe('isAgentlessEnabled', () => {
  it('should return false if cloud and serverless are not enabled', () => {
    jest
      .spyOn(appContextService, 'getExperimentalFeatures')
      .mockReturnValue({ agentless: false } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: false } as any);
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isServerlessEnabled: false } as any);

    expect(isAgentlessEnabled()).toBe(false);
  });

  it('should return false if cloud is enabled but agentless is not', () => {
    jest
      .spyOn(appContextService, 'getExperimentalFeatures')
      .mockReturnValue({ agentless: false } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isServerlessEnabled: false } as any);

    expect(isAgentlessEnabled()).toBe(false);
  });

  it('should return false if serverless is enabled but agentless is not', () => {
    jest
      .spyOn(appContextService, 'getExperimentalFeatures')
      .mockReturnValue({ agentless: false } as any);
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isCloudEnabled: false, isServerlessEnabled: true } as any);

    expect(isAgentlessEnabled()).toBe(false);
  });

  it('should return true if cloud is enabled and agentless is enabled', () => {
    jest
      .spyOn(appContextService, 'getExperimentalFeatures')
      .mockReturnValue({ agentless: true } as any);
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isCloudEnabled: true, isServerlessEnabled: false } as any);

    expect(isAgentlessEnabled()).toBe(true);
  });

  it('should return true if serverless is enabled and agentless is enabled', () => {
    jest
      .spyOn(appContextService, 'getExperimentalFeatures')
      .mockReturnValue({ agentless: true } as any);
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isCloudEnabled: false, isServerlessEnabled: true } as any);

    expect(isAgentlessEnabled()).toBe(true);
  });
});
