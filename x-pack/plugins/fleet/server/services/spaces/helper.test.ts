/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { Settings } from '../../types';
import { appContextService } from '../app_context';
import { getSettings } from '../settings';

import { isSpaceAwarenessEnabled, _clearSpaceAwarenessCache } from './helpers';

jest.mock('../app_context');
jest.mock('../settings');

function mockFeatureFlag(val: boolean) {
  jest.mocked(appContextService.getExperimentalFeatures).mockReturnValue({
    useSpaceAwareness: val,
  } as any);
}

function mockGetSettings(settings?: Partial<Settings>) {
  if (settings) {
    jest.mocked(getSettings).mockResolvedValue(settings as any);
  } else {
    jest.mocked(getSettings).mockRejectedValue(Boom.notFound());
  }
}

describe('isSpaceAwarenessEnabled', () => {
  beforeEach(() => {
    jest.mocked(appContextService.getExperimentalFeatures).mockReset();
    jest.mocked(getSettings).mockReset();
    _clearSpaceAwarenessCache();
  });
  it('should return false if feature flag is disabled', async () => {
    mockFeatureFlag(false);
    const res = await isSpaceAwarenessEnabled();

    expect(res).toBe(false);
  });

  it('should return false if feature flag is enabled but user did not optin', async () => {
    mockFeatureFlag(true);
    mockGetSettings({
      use_space_awareness_migration_status: undefined,
    });
    const res = await isSpaceAwarenessEnabled();

    expect(res).toBe(false);
  });

  it('should return false if feature flag is enabled and settings do not exists', async () => {
    mockFeatureFlag(true);
    mockGetSettings();
    const res = await isSpaceAwarenessEnabled();

    expect(res).toBe(false);
  });

  it('should return true if feature flag is enabled and user optin', async () => {
    mockFeatureFlag(true);
    mockGetSettings({
      use_space_awareness_migration_status: 'success',
    });
    const res = await isSpaceAwarenessEnabled();

    expect(res).toBe(true);
  });

  it('should use cache if called multiple time and feature flag is enabled and user optin', async () => {
    mockFeatureFlag(true);
    mockGetSettings({
      use_space_awareness_migration_status: 'success',
    });
    await isSpaceAwarenessEnabled();
    await isSpaceAwarenessEnabled();
    expect(getSettings).toBeCalledTimes(1);
  });
});
