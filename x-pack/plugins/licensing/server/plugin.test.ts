/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';
import { take, toArray } from 'rxjs/operators';
import moment from 'moment';
import { LicenseType } from '../common/types';
import { ElasticsearchError, RawLicense } from './types';
import { LicensingPlugin } from './plugin';
import {
  coreMock,
  elasticsearchServiceMock,
  loggingServiceMock,
} from '../../../../src/core/server/mocks';

function buildRawLicense(options: Partial<RawLicense> = {}): RawLicense {
  const defaultRawLicense: RawLicense = {
    uid: 'uid-000000001234',
    status: 'active',
    type: 'basic',
    expiry_date_in_millis: 1000,
  };
  return Object.assign(defaultRawLicense, options);
}
const pollingFrequency = moment.duration(100);

const flushPromises = (ms = 50) => new Promise(res => setTimeout(res, ms));

describe('licensing plugin', () => {
  describe('#setup', () => {
    describe('#license$', () => {
      let plugin: LicensingPlugin;
      let pluginInitContextMock: ReturnType<typeof coreMock.createPluginInitializerContext>;

      beforeEach(() => {
        pluginInitContextMock = coreMock.createPluginInitializerContext({
          pollingFrequency,
        });
        plugin = new LicensingPlugin(pluginInitContextMock);
      });

      afterEach(async () => {
        await plugin.stop();
      });

      it('returns license', async () => {
        const dataClient = elasticsearchServiceMock.createClusterClient();
        dataClient.callAsInternalUser.mockResolvedValue({
          license: buildRawLicense(),
          features: {},
        });
        const coreSetup = coreMock.createSetup();
        coreSetup.elasticsearch.dataClient$ = new BehaviorSubject(dataClient);

        const { license$ } = await plugin.setup(coreSetup);
        const license = await license$.pipe(take(1)).toPromise();
        expect(license.isAvailable).toBe(true);
      });

      it('observable receives updated licenses', async () => {
        const types: LicenseType[] = ['basic', 'gold', 'platinum'];

        const dataClient = elasticsearchServiceMock.createClusterClient();
        dataClient.callAsInternalUser.mockImplementation(() =>
          Promise.resolve({
            license: buildRawLicense({ type: types.shift() }),
            features: {},
          })
        );
        const coreSetup = coreMock.createSetup();
        coreSetup.elasticsearch.dataClient$ = new BehaviorSubject(dataClient);

        const { license$ } = await plugin.setup(coreSetup);
        const [first, second, third] = await license$.pipe(take(3), toArray()).toPromise();

        expect(first.type).toBe('basic');
        expect(second.type).toBe('gold');
        expect(third.type).toBe('platinum');
      });

      it('returns a license with error when request fails', async () => {
        const dataClient = elasticsearchServiceMock.createClusterClient();
        dataClient.callAsInternalUser.mockRejectedValue(new Error('test'));
        const coreSetup = coreMock.createSetup();
        coreSetup.elasticsearch.dataClient$ = new BehaviorSubject(dataClient);

        const { license$ } = await plugin.setup(coreSetup);
        const license = await license$.pipe(take(1)).toPromise();
        expect(license.isAvailable).toBe(false);
        expect(license.error).toBeDefined();
      });

      it('generate error message when x-pack plugin was not installed', async () => {
        const dataClient = elasticsearchServiceMock.createClusterClient();
        const error: ElasticsearchError = new Error('reason');
        error.status = 400;
        dataClient.callAsInternalUser.mockRejectedValue(error);
        const coreSetup = coreMock.createSetup();
        coreSetup.elasticsearch.dataClient$ = new BehaviorSubject(dataClient);

        const { license$ } = await plugin.setup(coreSetup);
        const license = await license$.pipe(take(1)).toPromise();
        expect(license.isAvailable).toBe(false);
        expect(license.error).toBe('X-Pack plugin is not installed on the Elasticsearch cluster.');
      });

      it('polling continues even if there are errors', async () => {
        const error1 = new Error('reason-1');
        const error2 = new Error('reason-2');

        const dataClient = elasticsearchServiceMock.createClusterClient();

        dataClient.callAsInternalUser
          .mockRejectedValueOnce(error1)
          .mockRejectedValueOnce(error2)
          .mockResolvedValue({ license: buildRawLicense(), features: {} });

        const coreSetup = coreMock.createSetup();
        coreSetup.elasticsearch.dataClient$ = new BehaviorSubject(dataClient);

        const { license$ } = await plugin.setup(coreSetup);
        const [first, second, third] = await license$.pipe(take(3), toArray()).toPromise();

        expect(first.error).toBe(error1.message);
        expect(second.error).toBe(error2.message);
        expect(third.type).toBe('basic');
      });

      it('fetch license immediately without subscriptions', async () => {
        const dataClient = elasticsearchServiceMock.createClusterClient();
        dataClient.callAsInternalUser.mockResolvedValue({
          license: buildRawLicense(),
          features: {},
        });

        const coreSetup = coreMock.createSetup();
        coreSetup.elasticsearch.dataClient$ = new BehaviorSubject(dataClient);

        await plugin.setup(coreSetup);
        await flushPromises();
        expect(dataClient.callAsInternalUser).toHaveBeenCalledTimes(1);
      });

      it('logs license details without subscriptions', async () => {
        const dataClient = elasticsearchServiceMock.createClusterClient();
        dataClient.callAsInternalUser.mockResolvedValue({
          license: buildRawLicense(),
          features: {},
        });

        const coreSetup = coreMock.createSetup();
        coreSetup.elasticsearch.dataClient$ = new BehaviorSubject(dataClient);

        await plugin.setup(coreSetup);
        await flushPromises();

        const loggedMessages = loggingServiceMock.collect(pluginInitContextMock.logger).debug;

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

        const dataClient = elasticsearchServiceMock.createClusterClient();
        dataClient.callAsInternalUser.mockImplementation(() =>
          Promise.resolve({
            license: buildRawLicense({ type: types.shift() }),
            features: {},
          })
        );

        const coreSetup = coreMock.createSetup();
        coreSetup.elasticsearch.dataClient$ = new BehaviorSubject(dataClient);

        const { license$ } = await plugin.setup(coreSetup);
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
            pollingFrequency: moment.duration(50000),
          })
        );
        const dataClient = elasticsearchServiceMock.createClusterClient();
        dataClient.callAsInternalUser.mockResolvedValue({
          license: buildRawLicense(),
          features: {},
        });
        const coreSetup = coreMock.createSetup();
        coreSetup.elasticsearch.dataClient$ = new BehaviorSubject(dataClient);
        const { refresh } = await plugin.setup(coreSetup);

        expect(dataClient.callAsInternalUser).toHaveBeenCalledTimes(0);

        refresh();
        expect(dataClient.callAsInternalUser).toHaveBeenCalledTimes(1);

        refresh();
        expect(dataClient.callAsInternalUser).toHaveBeenCalledTimes(2);
      });
    });

    describe('extends core contexts', () => {
      let plugin: LicensingPlugin;

      beforeEach(() => {
        plugin = new LicensingPlugin(
          coreMock.createPluginInitializerContext({
            pollingFrequency,
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
        plugin = new LicensingPlugin(coreMock.createPluginInitializerContext({ pollingFrequency }));
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
          pollingFrequency,
        })
      );
      const coreSetup = coreMock.createSetup();
      const { license$ } = await plugin.setup(coreSetup);

      let completed = false;
      license$.subscribe({ complete: () => (completed = true) });

      await plugin.stop();
      expect(completed).toBe(true);
    });
  });
});
