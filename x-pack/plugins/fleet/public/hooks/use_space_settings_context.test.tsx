/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createFleetTestRendererMock } from '../mock';
import { ExperimentalFeaturesService } from '../services';

import { useGetSpaceSettings } from './use_request';
import {
  SpaceSettingsContextProvider,
  useSpaceSettingsContext,
} from './use_space_settings_context';

jest.mock('./use_request');
jest.mock('../services');

describe('useSpaceSettingsContext', () => {
  function renderHook() {
    return createFleetTestRendererMock().renderHook(
      () => useSpaceSettingsContext(),
      ({ children }: { children: any }) => (
        <SpaceSettingsContextProvider>{children}</SpaceSettingsContextProvider>
      )
    );
  }
  beforeEach(() => {
    jest.mocked(ExperimentalFeaturesService.get).mockReturnValue({
      useSpaceAwareness: true,
    } as any);
    jest.mocked(useGetSpaceSettings).mockReturnValue({} as any);
  });
  it('should return default defaultNamespace if no restrictions', () => {
    const res = renderHook();
    expect(res.result.current.defaultNamespace).toBe('default');
  });

  it('should return restricted defaultNamespace if there is namespace prefix restrictions', () => {
    jest.mocked(useGetSpaceSettings).mockReturnValue({
      isInitialLoading: false,
      data: {
        item: {
          allowed_namespace_prefixes: ['test'],
        },
      },
    } as any);
    const res = renderHook();
    expect(res.result.current.defaultNamespace).toBe('test');
  });
});
