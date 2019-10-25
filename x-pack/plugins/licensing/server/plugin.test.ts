/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';
import { take, toArray } from 'rxjs/operators';
import { RawLicense, LicenseType } from './types';
import { LicensingPlugin } from './plugin';
import { coreMock, elasticsearchServiceMock } from '../../../../src/core/server/mocks';

function buildRawLicense(options: Partial<RawLicense> = {}): RawLicense {
  const defaultRawLicense: RawLicense = {
    uid: 'uid-000000001234',
    status: 'active',
    type: 'basic',
    expiry_date_in_millis: 1000,
  };
  return Object.assign(defaultRawLicense, options);
}
const pollingFrequency = 100;

const flushPromises = (ms = 50) => new Promise(res => setTimeout(res, ms));

describe('licensing plugin', () => {
  describe('#setup', () => {
    describe('#license$', () => {
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

      it('returns license', async () => {
        const dataClient = elasticsearchServiceMock.createClusterClient();
        dataClient.callAsInternalUser.mockResolvedValue({
          license: buildRawLicense(),
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
          })
        );
        const coreSetup = coreMock.createSetup();
        coreSetup.elasticsearch.dataClient$ = new BehaviorSubject(dataClient);

        const { license$ } = await plugin.setup(coreSetup);
        const [first, second, third] = await license$
          .pipe(
            take(3),
            toArray()
          )
          .toPromise();

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

      it('polling continues even if there are errors', async () => {
        const allErrors = [new Error('reason-1'), new Error('reason-2')];
        const errors = [...allErrors];

        const dataClient = elasticsearchServiceMock.createClusterClient();

        dataClient.callAsInternalUser.mockImplementation(() =>
          errors.length > 0
            ? Promise.reject(errors.shift())
            : Promise.resolve({
                license: buildRawLicense(),
              })
        );

        const coreSetup = coreMock.createSetup();
        coreSetup.elasticsearch.dataClient$ = new BehaviorSubject(dataClient);

        const { license$ } = await plugin.setup(coreSetup);
        const [first, second, third] = await license$
          .pipe(
            take(3),
            toArray()
          )
          .toPromise();

        expect(first.error).toBe(allErrors[0]);
        expect(second.error).toBe(allErrors[1]);
        expect(third.type).toBe('basic');
      });

      it('fetch license immediately without subscriptions', async () => {
        const dataClient = elasticsearchServiceMock.createClusterClient();
        dataClient.callAsInternalUser.mockResolvedValue({
          license: buildRawLicense(),
        });

        const coreSetup = coreMock.createSetup();
        coreSetup.elasticsearch.dataClient$ = new BehaviorSubject(dataClient);

        await plugin.setup(coreSetup);
        await flushPromises();
        expect(dataClient.callAsInternalUser).toHaveBeenCalledTimes(1);
      });

      it('generates signature based on fetched license content', async () => {
        const types: LicenseType[] = ['basic', 'gold', 'basic'];

        const dataClient = elasticsearchServiceMock.createClusterClient();
        dataClient.callAsInternalUser.mockImplementation(() =>
          Promise.resolve({
            license: buildRawLicense({ type: types.shift() }),
          })
        );

        const coreSetup = coreMock.createSetup();
        coreSetup.elasticsearch.dataClient$ = new BehaviorSubject(dataClient);

        const { license$ } = await plugin.setup(coreSetup);
        const [first, second, third] = await license$
          .pipe(
            take(3),
            toArray()
          )
          .toPromise();

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
            pollingFrequency: 50000,
          })
        );
        const dataClient = elasticsearchServiceMock.createClusterClient();
        dataClient.callAsInternalUser.mockResolvedValue({
          license: buildRawLicense(),
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

    it('refresh does not trigger data re-fetch', async () => {
      const plugin = new LicensingPlugin(
        coreMock.createPluginInitializerContext({
          pollingFrequency,
        })
      );

      const dataClient = elasticsearchServiceMock.createClusterClient();
      dataClient.callAsInternalUser.mockResolvedValue({
        license: buildRawLicense(),
      });

      const coreSetup = coreMock.createSetup();
      coreSetup.elasticsearch.dataClient$ = new BehaviorSubject(dataClient);

      const { refresh } = await plugin.setup(coreSetup);

      dataClient.callAsInternalUser.mockClear();

      await plugin.stop();
      refresh();

      expect(dataClient.callAsInternalUser).toHaveBeenCalledTimes(0);
    });
  });
});
