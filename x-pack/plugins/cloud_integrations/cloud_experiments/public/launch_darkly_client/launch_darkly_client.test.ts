/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ldClientMock, launchDarklyLibraryMock } from './launch_darkly_client.test.mock';
import { LaunchDarklyClient, type LaunchDarklyClientConfig } from './launch_darkly_client';

describe('LaunchDarklyClient - browser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    launchDarklyLibraryMock.initialize.mockReturnValue(ldClientMock);
  });

  const config: LaunchDarklyClientConfig = {
    client_id: 'fake-client-id',
    client_log_level: 'debug',
  };

  describe('Public APIs', () => {
    let client: LaunchDarklyClient;
    const testUserMetadata = { userId: 'fake-user-id', kibanaVersion: 'version' };

    beforeEach(() => {
      client = new LaunchDarklyClient(config, 'version');
    });

    describe('updateUserMetadata', () => {
      test("calls the client's initialize method with all the possible values", async () => {
        expect(client).toHaveProperty('launchDarklyClient', undefined);

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

        await client.updateUserMetadata({ userId: 'fake-user-id', ...topFields, ...extraFields });

        expect(launchDarklyLibraryMock.initialize).toHaveBeenCalledWith(
          'fake-client-id',
          {
            key: 'fake-user-id',
            ...topFields,
            custom: extraFields,
          },
          {
            application: { id: 'kibana-browser', version: 'version' },
            logger: undefined,
          }
        );
      });

      test('sets a minimum amount of info', async () => {
        expect(client).toHaveProperty('launchDarklyClient', undefined);

        await client.updateUserMetadata({ userId: 'fake-user-id', kibanaVersion: 'version' });

        expect(launchDarklyLibraryMock.initialize).toHaveBeenCalledWith(
          'fake-client-id',
          {
            key: 'fake-user-id',
            custom: { kibanaVersion: 'version' },
          },
          {
            application: { id: 'kibana-browser', version: 'version' },
            logger: undefined,
          }
        );
      });

      test('calls identify if an update comes after initializing the client', async () => {
        expect(client).toHaveProperty('launchDarklyClient', undefined);

        await client.updateUserMetadata({ userId: 'fake-user-id', kibanaVersion: 'version' });

        expect(launchDarklyLibraryMock.initialize).toHaveBeenCalledWith(
          'fake-client-id',
          {
            key: 'fake-user-id',
            custom: { kibanaVersion: 'version' },
          },
          {
            application: { id: 'kibana-browser', version: 'version' },
            logger: undefined,
          }
        );
        expect(ldClientMock.identify).not.toHaveBeenCalled();

        // Update user metadata a 2nd time
        await client.updateUserMetadata({ userId: 'fake-user-id', kibanaVersion: 'version' });
        expect(ldClientMock.identify).toHaveBeenCalledWith({
          key: 'fake-user-id',
          custom: { kibanaVersion: 'version' },
        });
      });
    });

    describe('getVariation', () => {
      test('calls the LaunchDarkly client when the user has been defined', async () => {
        ldClientMock.variation.mockResolvedValue(1234);
        await client.updateUserMetadata(testUserMetadata);
        await expect(client.getVariation('my-feature-flag', 123)).resolves.toStrictEqual(1234);
        expect(ldClientMock.variation).toHaveBeenCalledTimes(1);
        expect(ldClientMock.variation).toHaveBeenCalledWith('my-feature-flag', 123);
      });

      test('waits for initialization to complete before calling the LaunchDarkly client', async () => {
        ldClientMock.variation.mockResolvedValue(1234);
        client.updateUserMetadata(testUserMetadata); // don't await
        await expect(client.getVariation('my-feature-flag', 123)).resolves.toStrictEqual(1234);
      });

      test('returns default value if ld client initialization errors', async () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        launchDarklyLibraryMock.initialize.mockImplementationOnce(() => {
          throw new Error('Something went wrong');
        });
        client.updateUserMetadata(testUserMetadata); // don't await
        await expect(client.getVariation('my-feature-flag', 123)).resolves.toStrictEqual(123);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          `Failed to initialize launchDarkly client`,
          new Error('Something went wrong')
        );
      });
    });

    describe('reportMetric', () => {
      test('does not call track if the user has not been defined', () => {
        client.reportMetric('my-feature-flag', {}, 123);
        expect(ldClientMock.track).toHaveBeenCalledTimes(0);
      });

      test('calls the LaunchDarkly client when the user has been defined', async () => {
        await client.updateUserMetadata(testUserMetadata);
        await client.reportMetric('my-feature-flag', {}, 123);
        expect(ldClientMock.track).toHaveBeenCalledTimes(1);
        expect(ldClientMock.track).toHaveBeenCalledWith('my-feature-flag', {}, 123);
      });
    });

    describe('stop', () => {
      test('flushes the events', async () => {
        await client.updateUserMetadata(testUserMetadata);

        ldClientMock.flush.mockResolvedValue();
        expect(() => client.stop()).not.toThrow();
        await new Promise((resolve) => process.nextTick(resolve)); // wait for the flush resolution
        expect(ldClientMock.flush).toHaveBeenCalledTimes(1);
        await new Promise((resolve) => process.nextTick(resolve)); // wait for the flush resolution
      });

      test('handles errors when flushing events', async () => {
        await client.updateUserMetadata(testUserMetadata);

        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const err = new Error('Something went terribly wrong');
        ldClientMock.flush.mockRejectedValue(err);
        expect(() => client.stop()).not.toThrow();
        await new Promise((resolve) => process.nextTick(resolve)); // wait for the flush resolution
        expect(ldClientMock.flush).toHaveBeenCalledTimes(1);
        await new Promise((resolve) => process.nextTick(resolve)); // wait for the flush resolution
        expect(consoleWarnSpy).toHaveBeenCalledWith(err);
      });
    });
  });
});
