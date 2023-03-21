/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { ldClientMock } from './launch_darkly_client.test.mock';
import LaunchDarkly from 'launchdarkly-node-server-sdk';
import { LaunchDarklyClient, type LaunchDarklyClientConfig } from './launch_darkly_client';

describe('LaunchDarklyClient - server', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const config: LaunchDarklyClientConfig = {
    sdk_key: 'fake-sdk-key',
    client_id: 'fake-client-id',
    client_log_level: 'debug',
    kibana_version: 'version',
  };

  describe('constructor', () => {
    let launchDarklyInitSpy: jest.SpyInstance;

    beforeEach(() => {
      launchDarklyInitSpy = jest.spyOn(LaunchDarkly, 'init');
    });

    afterEach(() => {
      launchDarklyInitSpy.mockRestore();
    });

    test('it initializes the LaunchDarkly client', async () => {
      const logger = loggerMock.create();
      ldClientMock.waitForInitialization.mockResolvedValue(ldClientMock);

      const client = new LaunchDarklyClient(config, logger);
      expect(launchDarklyInitSpy).toHaveBeenCalledWith('fake-sdk-key', {
        application: { id: 'kibana-server', version: 'version' },
        logger: undefined, // The method basicLogger is mocked without a return value
        stream: false,
      });
      expect(client).toHaveProperty('launchDarklyClient', ldClientMock);
      await new Promise((resolve) => process.nextTick(resolve)); // wait for the waitForInitialization resolution
      expect(logger.debug).toHaveBeenCalledWith('LaunchDarkly is initialized!');
    });

    test('it initializes the LaunchDarkly client... and handles failure', async () => {
      const logger = loggerMock.create();
      ldClientMock.waitForInitialization.mockRejectedValue(
        new Error('Something went terribly wrong')
      );

      const client = new LaunchDarklyClient(config, logger);
      expect(launchDarklyInitSpy).toHaveBeenCalledWith('fake-sdk-key', {
        application: { id: 'kibana-server', version: 'version' },
        logger: undefined, // The method basicLogger is mocked without a return value
        stream: false,
      });
      expect(client).toHaveProperty('launchDarklyClient', ldClientMock);
      await new Promise((resolve) => process.nextTick(resolve)); // wait for the waitForInitialization resolution
      expect(logger.warn).toHaveBeenCalledWith(
        'Error initializing LaunchDarkly: Error: Something went terribly wrong'
      );
    });
  });

  describe('Public APIs', () => {
    let client: LaunchDarklyClient;
    let logger: MockedLogger;
    const testUserMetadata = { userId: 'fake-user-id', kibanaVersion: 'version' };

    beforeEach(() => {
      logger = loggerMock.create();
      ldClientMock.waitForInitialization.mockResolvedValue(ldClientMock);
      client = new LaunchDarklyClient(config, logger);
    });

    describe('updateUserMetadata', () => {
      test('sets the top-level properties at the root (renaming userId to key) and the rest under `custom`', () => {
        expect(client).toHaveProperty('launchDarklyUser', undefined);

        const topFields = {
          name: 'First Last',
          firstName: 'First',
          lastName: 'Last',
          email: 'first.last@boring.co',
          avatar: 'fake-blue-avatar',
          ip: 'my-weird-ip',
          country: 'distributed',
        };

        const extraFields = {
          other_field: 'my other custom field',
          kibanaVersion: 'version',
        };

        client.updateUserMetadata({ userId: 'fake-user-id', ...topFields, ...extraFields });

        expect(client).toHaveProperty('launchDarklyUser', {
          key: 'fake-user-id',
          ...topFields,
          custom: extraFields,
        });
      });

      test('sets a minimum amount of info', () => {
        expect(client).toHaveProperty('launchDarklyUser', undefined);

        client.updateUserMetadata({ userId: 'fake-user-id', kibanaVersion: 'version' });

        expect(client).toHaveProperty('launchDarklyUser', {
          key: 'fake-user-id',
          custom: { kibanaVersion: 'version' },
        });
      });
    });

    describe('getVariation', () => {
      test('returns the default value if the user has not been defined', async () => {
        await expect(client.getVariation('my-feature-flag', 123)).resolves.toStrictEqual(123);
        expect(ldClientMock.variation).toHaveBeenCalledTimes(0);
      });

      test('calls the LaunchDarkly client when the user has been defined', async () => {
        ldClientMock.variation.mockResolvedValue(1234);
        client.updateUserMetadata(testUserMetadata);
        await expect(client.getVariation('my-feature-flag', 123)).resolves.toStrictEqual(1234);
        expect(ldClientMock.variation).toHaveBeenCalledTimes(1);
        expect(ldClientMock.variation).toHaveBeenCalledWith(
          'my-feature-flag',
          { key: 'fake-user-id', custom: { kibanaVersion: 'version' } },
          123
        );
      });
    });

    describe('reportMetric', () => {
      test('does not call track if the user has not been defined', () => {
        client.reportMetric('my-feature-flag', {}, 123);
        expect(ldClientMock.track).toHaveBeenCalledTimes(0);
      });

      test('calls the LaunchDarkly client when the user has been defined', () => {
        client.updateUserMetadata(testUserMetadata);
        client.reportMetric('my-feature-flag', {}, 123);
        expect(ldClientMock.track).toHaveBeenCalledTimes(1);
        expect(ldClientMock.track).toHaveBeenCalledWith(
          'my-feature-flag',
          { key: 'fake-user-id', custom: { kibanaVersion: 'version' } },
          {},
          123
        );
      });
    });

    describe('getAllFlags', () => {
      test('returns the non-initialized state if the user has not been defined', async () => {
        await expect(client.getAllFlags()).resolves.toStrictEqual({
          initialized: false,
          flagNames: [],
          flags: {},
        });
        expect(ldClientMock.allFlagsState).toHaveBeenCalledTimes(0);
      });

      test('calls the LaunchDarkly client when the user has been defined', async () => {
        ldClientMock.allFlagsState.mockResolvedValue({
          valid: true,
          allValues: jest.fn().mockReturnValue({ my_flag: '1234' }),
          getFlagValue: jest.fn(),
          getFlagReason: jest.fn(),
          toJSON: jest.fn(),
        });
        client.updateUserMetadata(testUserMetadata);
        await expect(client.getAllFlags()).resolves.toStrictEqual({
          initialized: true,
          flagNames: ['my_flag'],
          flags: { my_flag: '1234' },
        });
        expect(ldClientMock.allFlagsState).toHaveBeenCalledTimes(1);
        expect(ldClientMock.allFlagsState).toHaveBeenCalledWith({
          key: 'fake-user-id',
          custom: { kibanaVersion: 'version' },
        });
      });
    });

    describe('stop', () => {
      test('flushes the events', async () => {
        ldClientMock.flush.mockResolvedValue();
        expect(() => client.stop()).not.toThrow();
        expect(ldClientMock.flush).toHaveBeenCalledTimes(1);
        await new Promise((resolve) => process.nextTick(resolve)); // wait for the flush resolution
        expect(logger.error).not.toHaveBeenCalled();
      });

      test('handles errors when flushing events', async () => {
        const err = new Error('Something went terribly wrong');
        ldClientMock.flush.mockRejectedValue(err);
        expect(() => client.stop()).not.toThrow();
        expect(ldClientMock.flush).toHaveBeenCalledTimes(1);
        await new Promise((resolve) => process.nextTick(resolve)); // wait for the flush resolution
        expect(logger.error).toHaveBeenCalledWith(err);
      });
    });
  });
});
