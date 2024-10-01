/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { ExperimentalFeaturesService } from '../services';

import { useStartServices, useConfig } from '.';
import { useAgentless } from './use_agentless';

jest.mock('../services');
jest.mock('./use_config', () => ({
  useConfig: jest.fn(),
}));
jest.mock('./use_core', () => ({
  useStartServices: jest.fn(),
}));

type MockFn = jest.MockedFunction<any>;

describe('useAgentless', () => {
  const mockedExperimentalFeaturesService = jest.mocked(ExperimentalFeaturesService);

  beforeEach(() => {
    mockedExperimentalFeaturesService.get.mockReturnValue({
      agentless: false,
    } as any);
    (useConfig as MockFn).mockReturnValue({
      agentless: undefined,
    } as any);
    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isServerlessEnabled: false,
        isCloudEnabled: false,
      },
    });
    jest.clearAllMocks();
  });

  it('should not return isAgentless when agentless is not enabled', () => {
    const { result } = renderHook(() => useAgentless());

    expect(result.current.isAgentlessEnabled).toBeFalsy();
    expect(result.current.isAgentlessApiEnabled).toBeFalsy();
    expect(result.current.isDefaultAgentlessPolicyEnabled).toBeFalsy();
  });

  it('should return isAgentlessEnabled as falsy if agentless.enabled is true and experimental feature agentless is truthy without cloud or serverless', () => {
    (useConfig as MockFn).mockReturnValue({
      agentless: {
        enabled: true,
      },
    } as any);

    mockedExperimentalFeaturesService.get.mockReturnValue({
      agentless: false,
    } as any);

    const { result } = renderHook(() => useAgentless());

    expect(result.current.isAgentlessEnabled).toBeFalsy();
    expect(result.current.isAgentlessApiEnabled).toBeFalsy();
    expect(result.current.isDefaultAgentlessPolicyEnabled).toBeFalsy();
  });

  it('should return isAgentlessEnabled and isAgentlessApiEnabled as truthy with isCloudEnabled', () => {
    (useConfig as MockFn).mockReturnValue({
      agentless: {
        enabled: true,
      },
    } as any);

    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isServerlessEnabled: false,
        isCloudEnabled: true,
      },
    });

    const { result } = renderHook(() => useAgentless());

    expect(result.current.isAgentlessEnabled).toBeTruthy();
    expect(result.current.isAgentlessApiEnabled).toBeTruthy();
    expect(result.current.isDefaultAgentlessPolicyEnabled).toBeFalsy();
  });
  it('should return isAgentlessEnabled and isDefaultAgentlessPolicyEnabled as truthy with isServerlessEnabled and experimental feature agentless is truthy', () => {
    mockedExperimentalFeaturesService.get.mockReturnValue({
      agentless: true,
    } as any);

    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isServerlessEnabled: true,
        isCloudEnabled: false,
      },
    });

    const { result } = renderHook(() => useAgentless());

    expect(result.current.isAgentlessEnabled).toBeTruthy();
    expect(result.current.isAgentlessApiEnabled).toBeFalsy();
    expect(result.current.isDefaultAgentlessPolicyEnabled).toBeTruthy();
  });

  it('should return isAgentlessEnabled as falsy and isDefaultAgentlessPolicyEnabled as falsy with isServerlessEnabled and experimental feature agentless is falsy', () => {
    mockedExperimentalFeaturesService.get.mockReturnValue({
      agentless: false,
    } as any);

    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isServerlessEnabled: true,
        isCloudEnabled: false,
      },
    });

    const { result } = renderHook(() => useAgentless());

    expect(result.current.isAgentlessEnabled).toBeFalsy();
    expect(result.current.isAgentlessApiEnabled).toBeFalsy();
    expect(result.current.isDefaultAgentlessPolicyEnabled).toBeFalsy();
  });
});
