/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { ldClientMock, launchDarklyLibraryMock } from './launch_darkly_client.test.mock';
import { LaunchDarklyClient, type LaunchDarklyClientConfig } from './launch_darkly_client';

describe('LaunchDarklyClient - browser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const config: LaunchDarklyClientConfig = {
    client_id: 'fake-client-id',
    client_log_level: 'debug',
  };

  describe('Public APIs', () => {
    let client: LaunchDarklyClient;
    const testUserMetadata = { userId: 'fake-user-id', kibanaVersion: 'version' };
    const loggerWarnSpy = jest.fn();
    beforeEach(() => {
      const initializerContext = coreMock.createPluginInitializerContext();
      const logger = initializerContext.logger.get();
      logger.warn = loggerWarnSpy;
      client = new LaunchDarklyClient(config, 'version', logger);
    });

    describe('updateUserMetadata', () => {
      test("calls the client's initialize method with all the possible values", async () => {
        launchDarklyLibraryMock.initialize.mockReturnValue(ldClientMock);

        const topFields = {
          name: 'First Last',
          firstName: 'First',
          lastName: 'Last',
          email: 'first.last@boring.co',
          avatar: 'fake-blue-avatar',
          ip: 'my-weird-ip',
          country: 'distributed',
          // intentionally adding this to make sure the code is overriding appropriately
          kind: 'other kind',
          key: 'other user',
        };

        const extraFields = {
          other_field: 'my other custom field',
          kibanaVersion: 'version',
        };

        await client.updateUserMetadata({ userId: 'fake-user-id', ...topFields, ...extraFields });

        expect(launchDarklyLibraryMock.initialize).toHaveBeenCalledWith(
          'fake-client-id',
          {
            ...topFields,
            ...extraFields,
            kind: 'user',
            key: 'fake-user-id',
          },
          {
            application: { id: 'kibana-browser', version: 'version' },
            logger: undefined,
          }
        );
      });

      test('sets a minimum amount of info', async () => {
        await client.updateUserMetadata({ userId: 'fake-user-id', kibanaVersion: 'version' });

        expect(launchDarklyLibraryMock.initialize).toHaveBeenCalledWith(
          'fake-client-id',
          {
            kind: 'user',
            key: 'fake-user-id',
            kibanaVersion: 'version',
          },
          {
            application: { id: 'kibana-browser', version: 'version' },
            logger: undefined,
          }
        );
      });

      test('calls identify if an update comes after initializing the client', async () => {
        launchDarklyLibraryMock.initialize.mockReturnValue(ldClientMock);
        await client.updateUserMetadata({ userId: 'fake-user-id', kibanaVersion: 'version' });

        expect(launchDarklyLibraryMock.initialize).toHaveBeenCalledWith(
          'fake-client-id',
          {
            kind: 'user',
            key: 'fake-user-id',
            kibanaVersion: 'version',
          },
          {
            application: { id: 'kibana-browser', version: 'version' },
            logger: undefined,
          }
        );
        expect(ldClientMock.identify).not.toHaveBeenCalled();

        // Update user metadata a 2nd time
        launchDarklyLibraryMock.initialize.mockReset();
        await client.updateUserMetadata({ userId: 'fake-user-id', kibanaVersion: 'version' });
        expect(ldClientMock.identify).toHaveBeenCalledWith({
          kind: 'user',
          key: 'fake-user-id',
          kibanaVersion: 'version',
        });
        expect(launchDarklyLibraryMock.initialize).not.toHaveBeenCalled();
      });
    });

    describe('getVariation', () => {
      test('waits for the user to been defined and does NOT return default value', async () => {
        ldClientMock.variation.mockResolvedValue(1234); // Expected is 1234
        launchDarklyLibraryMock.initialize.mockReturnValue(ldClientMock);
        const promise = client.getVariation('my-feature-flag', 123); // Default value is 123

        await client.updateUserMetadata(testUserMetadata);
        await expect(promise).resolves.toStrictEqual(1234);
        expect(ldClientMock.variation).toHaveBeenCalledTimes(1);
      });

      test('return default value if canceled', async () => {
        ldClientMock.variation.mockResolvedValue(1234);
        launchDarklyLibraryMock.initialize.mockReturnValue(ldClientMock);
        const promise = client.getVariation('my-feature-flag', 123); // Default value is 123

        client.cancel();

        await client.updateUserMetadata(testUserMetadata);
        await expect(promise).resolves.toStrictEqual(123); // default value
        expect(ldClientMock.variation).toHaveBeenCalledTimes(0);
        expect(launchDarklyLibraryMock.initialize).not.toHaveBeenCalled();
      });

      test('calls the LaunchDarkly client when the user has been defined', async () => {
        ldClientMock.variation.mockResolvedValue(1234);
        launchDarklyLibraryMock.initialize.mockReturnValue(ldClientMock);
        await client.updateUserMetadata(testUserMetadata);
        await expect(client.getVariation('my-feature-flag', 123)).resolves.toStrictEqual(1234);
        expect(ldClientMock.variation).toHaveBeenCalledTimes(1);
        expect(ldClientMock.variation).toHaveBeenCalledWith('my-feature-flag', 123);
      });
    });

    describe('reportMetric', () => {
      test('does not call track if the user has not been defined', () => {
        client.reportMetric('my-feature-flag', {}, 123);
        expect(ldClientMock.track).toHaveBeenCalledTimes(0);
      });

      test('calls the LaunchDarkly client when the user has been defined', async () => {
        launchDarklyLibraryMock.initialize.mockReturnValue(ldClientMock);
        await client.updateUserMetadata(testUserMetadata);
        client.reportMetric('my-feature-flag', {}, 123);
        await new Promise((resolve) => process.nextTick(resolve)); // wait for the client to be available
        expect(ldClientMock.track).toHaveBeenCalledTimes(1);
        expect(ldClientMock.track).toHaveBeenCalledWith('my-feature-flag', {}, 123);
      });
    });

    describe('stop', () => {
      test('flushes the events', async () => {
        launchDarklyLibraryMock.initialize.mockReturnValue(ldClientMock);
        await client.updateUserMetadata(testUserMetadata);

        ldClientMock.flush.mockResolvedValue();
        expect(() => client.stop()).not.toThrow();
        await new Promise((resolve) => process.nextTick(resolve)); // wait for the client to be available
        expect(ldClientMock.flush).toHaveBeenCalledTimes(1);
        await new Promise((resolve) => process.nextTick(resolve)); // wait for the flush resolution
      });

      test('handles errors when flushing events', async () => {
        launchDarklyLibraryMock.initialize.mockReturnValue(ldClientMock);
        await client.updateUserMetadata(testUserMetadata);

        const err = new Error('Something went terribly wrong');
        ldClientMock.flush.mockRejectedValue(err);
        expect(() => client.stop()).not.toThrow();
        await new Promise((resolve) => process.nextTick(resolve));
        expect(ldClientMock.flush).toHaveBeenCalledTimes(1);
        await new Promise((resolve) => process.nextTick(resolve)); // wait for the flush resolution
        expect(loggerWarnSpy).toHaveBeenCalledWith(err);
      });
    });
  });
});
