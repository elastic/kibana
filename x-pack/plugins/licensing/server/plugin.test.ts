/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { BehaviorSubject, firstValueFrom, take, toArray } from 'rxjs';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  ClusterClientMock,
  coreMock,
  elasticsearchServiceMock,
  loggingSystemMock,
  statusServiceMock,
} from '@kbn/core/server/mocks';
import {
  CoreStatus,
  IClusterClient,
  ServiceStatusLevel,
  ServiceStatusLevels,
} from '@kbn/core/server';
import { LicenseType } from '../common/types';
import { ElasticsearchError } from './types';
import { LicensingPlugin } from './plugin';

function buildRawLicense(
  options: Partial<estypes.XpackInfoMinimalLicenseInformation> = {}
): estypes.XpackInfoMinimalLicenseInformation {
  return {
    uid: 'uid-000000001234',
    status: 'active',
    type: 'basic',
    mode: 'basic',
    expiry_date_in_millis: 1000,
    ...options,
  };
}

const flushPromises = (ms = 50) => new Promise((res) => setTimeout(res, ms));

function createCoreSetupWith(esClient: IClusterClient) {
  const coreSetup = coreMock.createSetup();
  const coreStart = coreMock.createStart();
  coreSetup.getStartServices.mockResolvedValue([
    {
      ...coreStart,
      elasticsearch: {
        ...coreStart.elasticsearch,
        client: esClient,
      },
    },
    {},
    {},
  ]);
  return coreSetup;
}

describe('licensing plugin', () => {
  const createEsClient = (response?: Record<string, any>) => {
    const client = elasticsearchServiceMock.createClusterClient();
    if (response) {
      client.asInternalUser.xpack.info.mockResponse(response as any);
    }
    return client;
  };

  let plugin: LicensingPlugin;
  let pluginInitContextMock: ReturnType<typeof coreMock.createPluginInitializerContext>;

  beforeEach(() => {
    pluginInitContextMock = coreMock.createPluginInitializerContext({
      api_polling_frequency: moment.duration(100),
      license_cache_duration: moment.duration(1000),
    });
    plugin = new LicensingPlugin(pluginInitContextMock);
  });

  afterEach(async () => {
    await plugin?.stop();
  });

  describe('#start', () => {
    describe('#license$', () => {
      it('returns license', async () => {
        const esClient = createEsClient({
          license: buildRawLicense(),
          features: {},
        });

        const coreSetup = createCoreSetupWith(esClient);
        plugin.setup(coreSetup);
        const { license$ } = plugin.start();
        const license = await firstValueFrom(license$);
        expect(license.isAvailable).toBe(true);
      });

      it('calls `callAsInternalUser` with the correct parameters', async () => {
        const esClient = createEsClient({
          license: buildRawLicense(),
          features: {},
        });

        const coreSetup = createCoreSetupWith(esClient);
        plugin.setup(coreSetup);
        const { license$ } = plugin.start();
        await firstValueFrom(license$);

        expect(esClient.asInternalUser.xpack.info).toHaveBeenCalledTimes(1);
      });

      it('observable receives updated licenses', async () => {
        const types: LicenseType[] = ['basic', 'gold', 'platinum'];

        const esClient = createEsClient();
        esClient.asInternalUser.xpack.info.mockImplementation(() => {
          return Promise.resolve({
            license: buildRawLicense({ type: types.shift() }),
            features: {},
          } as estypes.XpackInfoResponse);
        });

        const coreSetup = createCoreSetupWith(esClient);
        plugin.setup(coreSetup);
        const { license$ } = plugin.start();
        const [first, second, third] = await firstValueFrom(license$.pipe(take(3), toArray()));

        expect(first.type).toBe('basic');
        expect(second.type).toBe('gold');
        expect(third.type).toBe('platinum');
      });

      it('returns a license with error when request fails', async () => {
        const esClient = createEsClient();
        esClient.asInternalUser.xpack.info.mockRejectedValue(new Error('test'));

        const coreSetup = createCoreSetupWith(esClient);
        plugin.setup(coreSetup);
        const { license$ } = plugin.start();

        const license = await firstValueFrom(license$);
        expect(license.isAvailable).toBe(false);
        expect(license.error).toBeDefined();
      });

      it('generate error message when x-pack plugin was not installed', async () => {
        const esClient = createEsClient();
        const error: ElasticsearchError = new Error('reason');
        error.status = 400;
        esClient.asInternalUser.xpack.info.mockRejectedValue(error);

        const coreSetup = createCoreSetupWith(esClient);
        plugin.setup(coreSetup);
        const { license$ } = plugin.start();

        const license = await firstValueFrom(license$);
        expect(license.isAvailable).toBe(false);
        expect(license.error).toBe('X-Pack plugin is not installed on the Elasticsearch cluster.');
      });

      it('polling continues even if there are errors', async () => {
        const error1 = new Error('reason-1');
        const error2 = new Error('reason-2');

        const esClient = createEsClient();
        let i = 0;
        esClient.asInternalUser.xpack.info.mockImplementation(() => {
          i++;
          if (i === 1) {
            return Promise.reject(error1);
          }
          if (i === 2) {
            return Promise.reject(error2);
          }
          return Promise.resolve({
            license: buildRawLicense(),
            features: {},
          } as estypes.XpackInfoResponse);
        });

        const coreSetup = createCoreSetupWith(esClient);
        plugin.setup(coreSetup);
        const { license$ } = plugin.start();

        const [first, second, third] = await firstValueFrom(license$.pipe(take(3), toArray()));

        expect(first.error).toBe(error1.message);
        expect(second.error).toBe(error2.message);
        expect(third.type).toBe('basic');
      });

      it('fetch license immediately without subscriptions', async () => {
        const esClient = createEsClient({
          license: buildRawLicense(),
          features: {},
        });

        const coreSetup = createCoreSetupWith(esClient);
        plugin.setup(coreSetup);
        plugin.start();

        await flushPromises();

        expect(esClient.asInternalUser.xpack.info).toHaveBeenCalledTimes(1);
      });

      it('logs license details without subscriptions', async () => {
        const esClient = createEsClient({
          license: buildRawLicense(),
          features: {},
        });

        const coreSetup = createCoreSetupWith(esClient);
        plugin.setup(coreSetup);
        plugin.start();

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

        const esClient = createEsClient();
        esClient.asInternalUser.xpack.info.mockImplementation(() => {
          return Promise.resolve({
            license: buildRawLicense({ type: types.shift() }),
            features: {},
          } as estypes.XpackInfoResponse);
        });

        const coreSetup = createCoreSetupWith(esClient);
        plugin.setup(coreSetup);
        const { license$ } = plugin.start();

        const [first, second, third] = await firstValueFrom(license$.pipe(take(3), toArray()));
        expect(first.signature === third.signature).toBe(true);
        expect(first.signature === second.signature).toBe(false);
      });
    });

    describe('#refresh', () => {
      it('forces refresh immediately', async () => {
        plugin = new LicensingPlugin(
          coreMock.createPluginInitializerContext({
            // disable polling mechanism
            api_polling_frequency: moment.duration(50000),
            license_cache_duration: moment.duration(1000),
          })
        );
        const esClient = createEsClient({
          license: buildRawLicense(),
          features: {},
        });

        const coreSetup = createCoreSetupWith(esClient);
        plugin.setup(coreSetup);
        const { refresh, license$ } = plugin.start();

        expect(esClient.asInternalUser.xpack.info).toHaveBeenCalledTimes(0);

        await firstValueFrom(license$);
        expect(esClient.asInternalUser.xpack.info).toHaveBeenCalledTimes(1);

        await refresh();
        await flushPromises();
        expect(esClient.asInternalUser.xpack.info).toHaveBeenCalledTimes(2);
      });
    });

    describe('#createLicensePoller', () => {
      it(`creates a poller fetching license from passed 'clusterClient' every 'api_polling_frequency' ms`, async () => {
        plugin = new LicensingPlugin(
          coreMock.createPluginInitializerContext({
            api_polling_frequency: moment.duration(50000),
            license_cache_duration: moment.duration(1000),
          })
        );

        const esClient = createEsClient({
          license: buildRawLicense(),
          features: {},
        });
        const coreSetup = createCoreSetupWith(esClient);
        plugin.setup(coreSetup);
        const { createLicensePoller, license$ } = plugin.start();

        const customClient = createEsClient({
          license: buildRawLicense({ type: 'gold' }),
          features: {},
        });

        const customPollingFrequency = 100;
        const { license$: customLicense$ } = createLicensePoller(
          customClient,
          customPollingFrequency
        );
        expect(customClient.asInternalUser.xpack.info).toHaveBeenCalledTimes(0);

        // We make the request when the timer ticks
        await flushPromises(customPollingFrequency);
        expect(customClient.asInternalUser.xpack.info).toHaveBeenCalledTimes(1);

        // And we have the license without making any extra requests
        const customLicense = await firstValueFrom(customLicense$);
        expect(customClient.asInternalUser.xpack.info).toHaveBeenCalledTimes(1);

        await flushPromises(customPollingFrequency * 1.5);

        expect(customLicense.isAvailable).toBe(true);
        expect(customLicense.type).toBe('gold');

        expect(await firstValueFrom(license$)).not.toBe(customLicense);
      });

      it('creates a poller with a manual refresh control', async () => {
        const coreSetup = coreMock.createSetup();
        plugin.setup(coreSetup);
        const { createLicensePoller } = plugin.start();

        const customClient = createEsClient({
          license: buildRawLicense({ type: 'gold' }),
          features: {},
        });

        const { license$, refresh } = createLicensePoller(customClient, 10000);
        expect(customClient.asInternalUser.xpack.info).toHaveBeenCalledTimes(0);

        await refresh();

        expect(customClient.asInternalUser.xpack.info).toHaveBeenCalledTimes(1);
        const license = await firstValueFrom(license$);
        expect(license.type).toBe('gold');
      });

      describe('only fetch the license if ES is available', () => {
        let customClient: ClusterClientMock;
        let coreStatus$: BehaviorSubject<CoreStatus>;
        let coreStatus: CoreStatus;
        const customPollingFrequency = 100;

        async function setElasticsearchStatus(esStatus: ServiceStatusLevel) {
          coreStatus$.next({
            ...coreStatus,
            elasticsearch: {
              ...coreStatus.elasticsearch,
              level: esStatus,
            },
          });
          await flushPromises(1); // need to wait for async operations
        }

        beforeEach(async () => {
          plugin = new LicensingPlugin(
            coreMock.createPluginInitializerContext({
              api_polling_frequency: moment.duration(50000),
              license_cache_duration: moment.duration(1000),
            })
          );

          const esClient = createEsClient({
            license: buildRawLicense(),
            features: {},
          });
          const coreSetup = createCoreSetupWith(esClient);
          coreStatus = await firstValueFrom(statusServiceMock.createSetupContract().core$);
          coreStatus$ = new BehaviorSubject<CoreStatus>({
            ...coreStatus,
            elasticsearch: {
              ...coreStatus.elasticsearch,
              level: ServiceStatusLevels.unavailable,
            },
          });
          coreSetup.status.core$ = coreStatus$;
          plugin.setup(coreSetup);
          const { createLicensePoller } = plugin.start();

          customClient = createEsClient({
            license: buildRawLicense({ type: 'gold' }),
            features: {},
          });

          createLicensePoller(customClient, customPollingFrequency);
        });

        it(`only fetch the license if ES is available`, async () => {
          expect(customClient.asInternalUser.xpack.info).toHaveBeenCalledTimes(0);

          // Despite waiting for the timer, it still doesn't call the API
          await flushPromises(customPollingFrequency * 1.8);
          expect(customClient.asInternalUser.xpack.info).toHaveBeenCalledTimes(0);

          // When ES becomes available, we perform the request
          await setElasticsearchStatus(ServiceStatusLevels.available);
          expect(customClient.asInternalUser.xpack.info).toHaveBeenCalledTimes(1);

          // While ES is still available, we retrieve the license on every timer tick
          await flushPromises(customPollingFrequency);
          expect(customClient.asInternalUser.xpack.info).toHaveBeenCalledTimes(2);
        });

        it(`stop fetching the license when ES becomes not available`, async () => {
          expect(customClient.asInternalUser.xpack.info).toHaveBeenCalledTimes(0);

          // When ES becomes available, we perform the request
          await setElasticsearchStatus(ServiceStatusLevels.available);
          expect(customClient.asInternalUser.xpack.info).toHaveBeenCalledTimes(1);

          // When ES becomes unavailable, we stop performing the requests
          await setElasticsearchStatus(ServiceStatusLevels.unavailable);
          await flushPromises(customPollingFrequency * 3);
          expect(customClient.asInternalUser.xpack.info).toHaveBeenCalledTimes(1);
        });

        it(`avoid fetching the license too often if ES status comes and goes`, async () => {
          expect(customClient.asInternalUser.xpack.info).toHaveBeenCalledTimes(0);

          // When ES becomes available, we perform the request
          await setElasticsearchStatus(ServiceStatusLevels.available);
          expect(customClient.asInternalUser.xpack.info).toHaveBeenCalledTimes(1);

          // When ES becomes unavailable, and immediately after, it becomes available
          await setElasticsearchStatus(ServiceStatusLevels.unavailable);
          expect(customClient.asInternalUser.xpack.info).toHaveBeenCalledTimes(1); // Still previous number of requests
          await setElasticsearchStatus(ServiceStatusLevels.available);
          expect(customClient.asInternalUser.xpack.info).toHaveBeenCalledTimes(1); // Still previous number of requests

          // After polling frequency, we retrieve it again
          await flushPromises(customPollingFrequency);
          expect(customClient.asInternalUser.xpack.info).toHaveBeenCalledTimes(2);
        });
      });
    });

    describe('extends core contexts', () => {
      it('provides a licensing context to http routes', async () => {
        const coreSetup = coreMock.createSetup();

        plugin.setup(coreSetup);

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
      it('once', async () => {
        const coreSetup = coreMock.createSetup();

        plugin.setup(coreSetup);

        expect(coreSetup.http.registerOnPreResponse).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('#stop', () => {
    it('stops polling', async () => {
      const coreSetup = coreMock.createSetup();
      plugin.setup(coreSetup);
      const { license$ } = plugin.start();

      let completed = false;
      license$.subscribe({ complete: () => (completed = true) });

      await plugin.stop();
      expect(completed).toBe(true);
    });
  });
});
