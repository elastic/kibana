/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { take, toArray } from 'rxjs/operators';
import moment from 'moment';
import { LicenseType } from '../common/types';
import { ElasticsearchError, RawLicense } from './types';
import { LicensingPlugin } from './plugin';
import {
  coreMock,
  elasticsearchServiceMock,
  loggingSystemMock,
} from '../../../../src/core/server/mocks';
import { IClusterClient } from '../../../../src/core/server/';

function buildRawLicense(options: Partial<RawLicense> = {}): RawLicense {
  const defaultRawLicense: RawLicense = {
    uid: 'uid-000000001234',
    status: 'active',
    type: 'basic',
    mode: 'basic',
    expiry_date_in_millis: 1000,
  };
  return Object.assign(defaultRawLicense, options);
}

const flushPromises = (ms = 50) => new Promise((res) => setTimeout(res, ms));

function createCoreSetupWith(esClient: IClusterClient) {
  const coreSetup = coreMock.createSetup();

  coreSetup.getStartServices.mockResolvedValue([
    {
      ...coreMock.createStart(),
      elasticsearch: { legacy: { client: esClient, createClient: jest.fn() } },
    },
    {},
    {},
  ]);
  return coreSetup;
}

describe('licensing plugin', () => {
  describe('#start', () => {
    describe('#license$', () => {
      let plugin: LicensingPlugin;
      let pluginInitContextMock: ReturnType<typeof coreMock.createPluginInitializerContext>;

      beforeEach(() => {
        pluginInitContextMock = coreMock.createPluginInitializerContext({
          api_polling_frequency: moment.duration(100),
        });
        plugin = new LicensingPlugin(pluginInitContextMock);
      });

      afterEach(async () => {
        await plugin.stop();
      });

      it('returns license', async () => {
        const esClient = elasticsearchServiceMock.createClusterClient();
        esClient.callAsInternalUser.mockResolvedValue({
          license: buildRawLicense(),
          features: {},
        });

        const coreSetup = createCoreSetupWith(esClient);
        await plugin.setup(coreSetup);
        const { license$ } = await plugin.start();
        const license = await license$.pipe(take(1)).toPromise();
        expect(license.isAvailable).toBe(true);
      });

      it('observable receives updated licenses', async () => {
        const types: LicenseType[] = ['basic', 'gold', 'platinum'];

        const esClient = elasticsearchServiceMock.createClusterClient();
        esClient.callAsInternalUser.mockImplementation(() =>
          Promise.resolve({
            license: buildRawLicense({ type: types.shift() }),
            features: {},
          })
        );

        const coreSetup = createCoreSetupWith(esClient);
        await plugin.setup(coreSetup);
        const { license$ } = await plugin.start();
        const [first, second, third] = await license$.pipe(take(3), toArray()).toPromise();

        expect(first.type).toBe('basic');
        expect(second.type).toBe('gold');
        expect(third.type).toBe('platinum');
      });

      it('returns a license with error when request fails', async () => {
        const esClient = elasticsearchServiceMock.createClusterClient();
        esClient.callAsInternalUser.mockRejectedValue(new Error('test'));

        const coreSetup = createCoreSetupWith(esClient);
        await plugin.setup(coreSetup);
        const { license$ } = await plugin.start();

        const license = await license$.pipe(take(1)).toPromise();
        expect(license.isAvailable).toBe(false);
        expect(license.error).toBeDefined();
      });

      it('generate error message when x-pack plugin was not installed', async () => {
        const esClient = elasticsearchServiceMock.createClusterClient();
        const error: ElasticsearchError = new Error('reason');
        error.status = 400;
        esClient.callAsInternalUser.mockRejectedValue(error);

        const coreSetup = createCoreSetupWith(esClient);
        await plugin.setup(coreSetup);
        const { license$ } = await plugin.start();

        const license = await license$.pipe(take(1)).toPromise();
        expect(license.isAvailable).toBe(false);
        expect(license.error).toBe('X-Pack plugin is not installed on the Elasticsearch cluster.');
      });

      it('polling continues even if there are errors', async () => {
        const error1 = new Error('reason-1');
        const error2 = new Error('reason-2');

        const esClient = elasticsearchServiceMock.createClusterClient();

        esClient.callAsInternalUser
          .mockRejectedValueOnce(error1)
          .mockRejectedValueOnce(error2)
          .mockResolvedValue({ license: buildRawLicense(), features: {} });

        const coreSetup = createCoreSetupWith(esClient);
        await plugin.setup(coreSetup);
        const { license$ } = await plugin.start();

        const [first, second, third] = await license$.pipe(take(3), toArray()).toPromise();
        expect(first.error).toBe(error1.message);
        expect(second.error).toBe(error2.message);
        expect(third.type).toBe('basic');
      });

      it('fetch license immediately without subscriptions', async () => {
        const esClient = elasticsearchServiceMock.createClusterClient();
        esClient.callAsInternalUser.mockResolvedValue({
          license: buildRawLicense(),
          features: {},
        });

        const coreSetup = createCoreSetupWith(esClient);
        await plugin.setup(coreSetup);
        await plugin.start();

        await flushPromises();

        expect(esClient.callAsInternalUser).toHaveBeenCalledTimes(1);
      });

      it('logs license details without subscriptions', async () => {
        const esClient = elasticsearchServiceMock.createClusterClient();
        esClient.callAsInternalUser.mockResolvedValue({
          license: buildRawLicense(),
          features: {},
        });

        const coreSetup = createCoreSetupWith(esClient);
        await plugin.setup(coreSetup);
        await plugin.start();

        await flushPromises();

        const loggedMessages = loggingSystemMock.collect(pluginInitContextMock.logger).debug;

        expect(
          loggedMessages.some(([message]) =>
            message.startsWith(
              'Imported license information from Elasticsearch:type: basic | status: active | expiry date:'
            )
          )
        ).toBe(true);
      });

      it('generates signature based on fetched license content', async () => {
        const types: LicenseType[] = ['basic', 'gold', 'basic'];

        const esClient = elasticsearchServiceMock.createClusterClient();
        esClient.callAsInternalUser.mockImplementation(() =>
          Promise.resolve({
            license: buildRawLicense({ type: types.shift() }),
            features: {},
          })
        );

        const coreSetup = createCoreSetupWith(esClient);
        await plugin.setup(coreSetup);
        const { license$ } = await plugin.start();

        const [first, second, third] = await license$.pipe(take(3), toArray()).toPromise();
        expect(first.signature === third.signature).toBe(true);
        expect(first.signature === second.signature).toBe(false);
      });
    });

    describe('#refresh', () => {
      let plugin: LicensingPlugin;
      afterEach(async () => {
        await plugin.stop();
      });

      it('forces refresh immediately', async () => {
        plugin = new LicensingPlugin(
          coreMock.createPluginInitializerContext({
            // disable polling mechanism
            api_polling_frequency: moment.duration(50000),
          })
        );
        const esClient = elasticsearchServiceMock.createClusterClient();
        esClient.callAsInternalUser.mockResolvedValue({
          license: buildRawLicense(),
          features: {},
        });

        const coreSetup = createCoreSetupWith(esClient);
        await plugin.setup(coreSetup);
        const { refresh, license$ } = await plugin.start();

        expect(esClient.callAsInternalUser).toHaveBeenCalledTimes(0);

        await license$.pipe(take(1)).toPromise();
        expect(esClient.callAsInternalUser).toHaveBeenCalledTimes(1);

        refresh();
        await flushPromises();
        expect(esClient.callAsInternalUser).toHaveBeenCalledTimes(2);
      });
    });

    describe('#createLicensePoller', () => {
      let plugin: LicensingPlugin;

      afterEach(async () => {
        await plugin.stop();
      });

      it(`creates a poller fetching license from passed 'clusterClient' every 'api_polling_frequency' ms`, async () => {
        plugin = new LicensingPlugin(
          coreMock.createPluginInitializerContext({
            api_polling_frequency: moment.duration(50000),
          })
        );

        const esClient = elasticsearchServiceMock.createClusterClient();
        esClient.callAsInternalUser.mockResolvedValue({
          license: buildRawLicense(),
          features: {},
        });
        const coreSetup = createCoreSetupWith(esClient);
        await plugin.setup(coreSetup);
        const { createLicensePoller, license$ } = await plugin.start();

        const customClient = elasticsearchServiceMock.createClusterClient();
        customClient.callAsInternalUser.mockResolvedValue({
          license: buildRawLicense({ type: 'gold' }),
          features: {},
        });

        const customPollingFrequency = 100;
        const { license$: customLicense$ } = createLicensePoller(
          customClient,
          customPollingFrequency
        );
        expect(customClient.callAsInternalUser).toHaveBeenCalledTimes(0);

        const customLicense = await customLicense$.pipe(take(1)).toPromise();
        expect(customClient.callAsInternalUser).toHaveBeenCalledTimes(1);

        await flushPromises(customPollingFrequency * 1.5);

        expect(customLicense.isAvailable).toBe(true);
        expect(customLicense.type).toBe('gold');

        expect(await license$.pipe(take(1)).toPromise()).not.toBe(customLicense);
      });

      it('creates a poller with a manual refresh control', async () => {
        plugin = new LicensingPlugin(
          coreMock.createPluginInitializerContext({
            api_polling_frequency: moment.duration(100),
          })
        );

        const coreSetup = coreMock.createSetup();
        await plugin.setup(coreSetup);
        const { createLicensePoller } = await plugin.start();

        const customClient = elasticsearchServiceMock.createClusterClient();
        customClient.callAsInternalUser.mockResolvedValue({
          license: buildRawLicense({ type: 'gold' }),
          features: {},
        });

        const { license$, refresh } = createLicensePoller(customClient, 10000);
        expect(customClient.callAsInternalUser).toHaveBeenCalledTimes(0);

        await refresh();

        expect(customClient.callAsInternalUser).toHaveBeenCalledTimes(1);
        const license = await license$.pipe(take(1)).toPromise();
        expect(license.type).toBe('gold');
      });
    });

    describe('extends core contexts', () => {
      let plugin: LicensingPlugin;

      beforeEach(() => {
        plugin = new LicensingPlugin(
          coreMock.createPluginInitializerContext({
            api_polling_frequency: moment.duration(100),
          })
        );
      });

      afterEach(async () => {
        await plugin.stop();
      });

      it('provides a licensing context to http routes', async () => {
        const coreSetup = coreMock.createSetup();

        await plugin.setup(coreSetup);

        expect(coreSetup.http.registerRouteHandlerContext.mock.calls).toMatchInlineSnapshot(`
                  Array [
                    Array [
                      "licensing",
                      [Function],
                    ],
                  ]
              `);
      });
    });

    describe('registers on pre-response interceptor', () => {
      let plugin: LicensingPlugin;

      beforeEach(() => {
        plugin = new LicensingPlugin(
          coreMock.createPluginInitializerContext({ api_polling_frequency: moment.duration(100) })
        );
      });

      afterEach(async () => {
        await plugin.stop();
      });

      it('once', async () => {
        const coreSetup = coreMock.createSetup();

        await plugin.setup(coreSetup);

        expect(coreSetup.http.registerOnPreResponse).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('#stop', () => {
    it('stops polling', async () => {
      const plugin = new LicensingPlugin(
        coreMock.createPluginInitializerContext({
          api_polling_frequency: moment.duration(100),
        })
      );
      const coreSetup = coreMock.createSetup();
      await plugin.setup(coreSetup);
      const { license$ } = await plugin.start();

      let completed = false;
      license$.subscribe({ complete: () => (completed = true) });

      await plugin.stop();
      expect(completed).toBe(true);
    });
  });
});
