/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  usageCollectionPluginMock,
  createCollectorFetchContextMock,
} from '@kbn/usage-collection-plugin/server/mocks';
import type { Collector } from '@kbn/usage-collection-plugin/server/mocks';
import {
  registerUsageCollector,
  type LaunchDarklyEntitiesGetter,
  type Usage,
} from './register_usage_collector';
import { createLaunchDarklyClientMock } from '../plugin.test.mock';

describe('cloudExperiments usage collector', () => {
  let collector: Collector<Usage>;
  const getLaunchDarklyEntitiesMock: jest.MockedFunction<LaunchDarklyEntitiesGetter> = jest
    .fn()
    .mockImplementation(() => ({}));

  beforeEach(() => {
    const usageCollectionSetupMock = usageCollectionPluginMock.createSetupContract();
    registerUsageCollector(usageCollectionSetupMock, getLaunchDarklyEntitiesMock);
    collector = usageCollectionSetupMock.registerCollector.mock
      .calls[0][0] as unknown as Collector<Usage>;
  });

  test('isReady should always be true', () => {
    expect(collector.isReady()).toStrictEqual(true);
  });

  test('should return initialized false and empty values when the user and the client are not initialized', async () => {
    await expect(collector.fetch(createCollectorFetchContextMock())).resolves.toStrictEqual({
      flagNames: [],
      flags: {},
      initialized: false,
    });
  });

  test('should return initialized false and empty values when the user is not initialized', async () => {
    getLaunchDarklyEntitiesMock.mockReturnValueOnce({
      launchDarklyClient: createLaunchDarklyClientMock(),
    });
    await expect(collector.fetch(createCollectorFetchContextMock())).resolves.toStrictEqual({
      flagNames: [],
      flags: {},
      initialized: false,
    });
  });

  test('should return initialized false and empty values when the client is not initialized', async () => {
    getLaunchDarklyEntitiesMock.mockReturnValueOnce({ launchDarklyUser: { key: 'test' } });
    await expect(collector.fetch(createCollectorFetchContextMock())).resolves.toStrictEqual({
      flagNames: [],
      flags: {},
      initialized: false,
    });
  });

  test('should return all the flags returned by the client', async () => {
    const launchDarklyClient = createLaunchDarklyClientMock();
    getLaunchDarklyEntitiesMock.mockReturnValueOnce({
      launchDarklyClient,
      launchDarklyUser: { key: 'test' },
    });

    launchDarklyClient.allFlagsState.mockResolvedValueOnce({
      valid: true,
      getFlagValue: jest.fn(),
      getFlagReason: jest.fn(),
      toJSON: jest.fn(),
      allValues: jest.fn().mockReturnValueOnce({
        'my-plugin.my-feature-flag': true,
        'my-plugin.my-other-feature-flag': 22,
      }),
    });

    await expect(collector.fetch(createCollectorFetchContextMock())).resolves.toStrictEqual({
      flagNames: ['my-plugin.my-feature-flag', 'my-plugin.my-other-feature-flag'],
      flags: {
        'my-plugin.my-feature-flag': true,
        'my-plugin.my-other-feature-flag': 22,
      },
      initialized: true,
    });
  });
});
