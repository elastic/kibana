/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { take } from 'rxjs/operators';

import { LicenseType } from '../common/types';
import { LicensingPlugin, licensingSessionStorageKey } from './plugin';

import { License } from '../common/license';
import { licenseMock } from '../common/license.mock';
import { coreMock } from '../../../../src/core/public/mocks';
import { HttpInterceptor } from 'src/core/public';

describe('licensing plugin', () => {
  let plugin: LicensingPlugin;

  afterEach(async () => {
    await plugin.stop();
  });

  describe('#setup', () => {
    describe('#refresh', () => {
      it('forces data re-fetch', async () => {
        const sessionStorage = coreMock.createStorage();
        plugin = new LicensingPlugin(coreMock.createPluginInitializerContext(), sessionStorage);

        const coreSetup = coreMock.createSetup();
        const fetchedLicense = licenseMock.create({ license: { uid: 'fetched' } });
        coreSetup.http.get.mockResolvedValue(fetchedLicense);

        const { license$, refresh } = await plugin.setup(coreSetup);

        refresh();
        const license = await license$.pipe(take(1)).toPromise();

        expect(license.uid).toBe('fetched');
      });
    });

    describe('#license$', () => {
      it('starts with license saved in sessionStorage if available', async () => {
        const sessionStorage = coreMock.createStorage();
        const savedLicense = licenseMock.create({ license: { uid: 'saved' } });
        sessionStorage.getItem.mockReturnValue(JSON.stringify(savedLicense));
        plugin = new LicensingPlugin(coreMock.createPluginInitializerContext(), sessionStorage);

        const coreSetup = coreMock.createSetup();
        const { license$ } = await plugin.setup(coreSetup);

        const license = await license$.pipe(take(1)).toPromise();
        expect(license.isAvailable).toBe(true);
        expect(license.uid).toBe('saved');

        expect(sessionStorage.getItem).toBeCalledTimes(1);
        expect(sessionStorage.getItem).toHaveBeenCalledWith(licensingSessionStorageKey);
      });

      it('observable receives updated licenses', async done => {
        const types: LicenseType[] = ['gold', 'platinum'];

        const sessionStorage = coreMock.createStorage();
        sessionStorage.getItem.mockReturnValue(JSON.stringify(licenseMock.create()));
        plugin = new LicensingPlugin(coreMock.createPluginInitializerContext(), sessionStorage);

        const coreSetup = coreMock.createSetup();
        coreSetup.http.get.mockImplementation(() =>
          Promise.resolve(licenseMock.create({ license: { type: types.shift() } }))
        );
        const { license$, refresh } = await plugin.setup(coreSetup);

        let i = 0;
        license$.subscribe(value => {
          i++;
          if (i === 1) {
            expect(value.type).toBe('basic');
            refresh();
          } else if (i === 2) {
            expect(value.type).toBe('gold');
            refresh();
          } else if (i === 3) {
            expect(value.type).toBe('platinum');
            done();
          } else {
            throw new Error('unreachable');
          }
        });
      });

      it('saved fetched license & signature in session storage', async () => {
        const sessionStorage = coreMock.createStorage();
        plugin = new LicensingPlugin(coreMock.createPluginInitializerContext(), sessionStorage);

        const coreSetup = coreMock.createSetup();

        const fetchedLicense = licenseMock.create({ license: { uid: 'fresh' } });
        coreSetup.http.get.mockResolvedValue(fetchedLicense);

        const { license$, refresh } = await plugin.setup(coreSetup);

        refresh();
        const license = await license$.pipe(take(1)).toPromise();

        expect(license.uid).toBe('fresh');

        expect(sessionStorage.setItem).toBeCalledTimes(1);

        expect(sessionStorage.setItem.mock.calls[0][0]).toBe(licensingSessionStorageKey);
        expect(sessionStorage.setItem.mock.calls[0][1]).toMatchInlineSnapshot(
          `"{\\"license\\":{\\"uid\\":\\"fresh\\",\\"status\\":\\"active\\",\\"type\\":\\"basic\\",\\"expiryDateInMillis\\":5000},\\"features\\":{\\"ccr\\":{\\"isEnabled\\":true,\\"isAvailable\\":true},\\"ml\\":{\\"isEnabled\\":false,\\"isAvailable\\":true}},\\"signature\\":\\"xxxxxxxxx\\"}"`
        );

        const saved = JSON.parse(sessionStorage.setItem.mock.calls[0][1]);
        expect(License.fromJSON(saved).toJSON()).toEqual(fetchedLicense.toJSON());
      });

      it('returns a license with error when request fails', async () => {
        const sessionStorage = coreMock.createStorage();
        plugin = new LicensingPlugin(coreMock.createPluginInitializerContext(), sessionStorage);

        const coreSetup = coreMock.createSetup();
        coreSetup.http.get.mockRejectedValue(new Error('reason'));

        const { license$, refresh } = await plugin.setup(coreSetup);
        refresh();

        const license = await license$.pipe(take(1)).toPromise();

        expect(license.isAvailable).toBe(false);
        expect(license.error).toBe('reason');
      });

      it('remove license saved in session storage when request failed', async () => {
        const sessionStorage = coreMock.createStorage();
        plugin = new LicensingPlugin(coreMock.createPluginInitializerContext(), sessionStorage);

        const coreSetup = coreMock.createSetup();
        coreSetup.http.get.mockRejectedValue(new Error('sorry'));

        const { license$, refresh } = await plugin.setup(coreSetup);
        expect(sessionStorage.removeItem).toHaveBeenCalledTimes(0);

        refresh();
        await license$.pipe(take(1)).toPromise();

        expect(sessionStorage.removeItem).toHaveBeenCalledTimes(1);
        expect(sessionStorage.removeItem).toHaveBeenCalledWith(licensingSessionStorageKey);
      });
    });
  });
  describe('interceptor', () => {
    it('register http interceptor checking signature header', async () => {
      const sessionStorage = coreMock.createStorage();
      plugin = new LicensingPlugin(coreMock.createPluginInitializerContext(), sessionStorage);

      const coreSetup = coreMock.createSetup();

      await plugin.setup(coreSetup);
      expect(coreSetup.http.intercept).toHaveBeenCalledTimes(1);
    });

    it('http interceptor triggers re-fetch if signature header has changed', async () => {
      const sessionStorage = coreMock.createStorage();
      plugin = new LicensingPlugin(coreMock.createPluginInitializerContext(), sessionStorage);

      const coreSetup = coreMock.createSetup();

      coreSetup.http.get.mockResolvedValue(licenseMock.create({ signature: 'signature-1' }));

      let registeredInterceptor: HttpInterceptor;
      coreSetup.http.intercept.mockImplementation((interceptor: HttpInterceptor) => {
        registeredInterceptor = interceptor;
        return () => undefined;
      });

      const { license$ } = await plugin.setup(coreSetup);
      expect(registeredInterceptor!.response).toBeDefined();

      const httpResponse = {
        response: {
          headers: {
            get(name: string) {
              if (name === 'kbn-xpack-sig') {
                return 'signature-1';
              }
              throw new Error('unexpected header');
            },
          },
        },
        request: {
          url: 'http://10.10.10.10:5601/api/hello',
        },
      };
      expect(coreSetup.http.get).toHaveBeenCalledTimes(0);

      await registeredInterceptor!.response!(httpResponse as any, null as any);

      expect(coreSetup.http.get).toHaveBeenCalledTimes(1);

      const license = await license$.pipe(take(1)).toPromise();
      expect(license.isAvailable).toBe(true);

      await registeredInterceptor!.response!(httpResponse as any, null as any);

      expect(coreSetup.http.get).toHaveBeenCalledTimes(1);
    });

    it('http interceptor does not trigger re-fetch if requested x-pack/info endpoint', async () => {
      const sessionStorage = coreMock.createStorage();
      plugin = new LicensingPlugin(coreMock.createPluginInitializerContext(), sessionStorage);

      const coreSetup = coreMock.createSetup();

      let registeredInterceptor: HttpInterceptor;
      coreSetup.http.intercept.mockImplementation((interceptor: HttpInterceptor) => {
        registeredInterceptor = interceptor;
        return () => undefined;
      });

      const { license$ } = await plugin.setup(coreSetup);

      let updated = false;
      license$.subscribe(() => (updated = true));

      expect(registeredInterceptor!.response).toBeDefined();

      const httpResponse = {
        response: {
          headers: {
            get(name: string) {
              if (name === 'kbn-xpack-sig') {
                return 'signature-1';
              }
              throw new Error('unexpected header');
            },
          },
        },
        request: {
          url: 'http://10.10.10.10:5601/api/xpack/v1/info',
        },
      };
      expect(coreSetup.http.get).toHaveBeenCalledTimes(0);

      await registeredInterceptor!.response!(httpResponse as any, null as any);

      expect(coreSetup.http.get).toHaveBeenCalledTimes(0);

      expect(updated).toBe(false);
    });
  });
  describe('#stop', () => {
    it('stops polling', async () => {
      const sessionStorage = coreMock.createStorage();
      plugin = new LicensingPlugin(coreMock.createPluginInitializerContext(), sessionStorage);
      const coreSetup = coreMock.createSetup();
      const { license$ } = await plugin.setup(coreSetup);

      let completed = false;
      license$.subscribe({ complete: () => (completed = true) });

      await plugin.stop();
      expect(completed).toBe(true);
    });

    it('refresh does not trigger data re-fetch', async () => {
      const sessionStorage = coreMock.createStorage();
      plugin = new LicensingPlugin(coreMock.createPluginInitializerContext(), sessionStorage);
      const coreSetup = coreMock.createSetup();
      const { refresh } = await plugin.setup(coreSetup);

      await plugin.stop();

      refresh();

      expect(coreSetup.http.get).toHaveBeenCalledTimes(0);
    });

    it('removes http interceptor', async () => {
      const sessionStorage = coreMock.createStorage();
      plugin = new LicensingPlugin(coreMock.createPluginInitializerContext(), sessionStorage);

      const coreSetup = coreMock.createSetup();

      const removeInterceptorMock = jest.fn();
      coreSetup.http.intercept.mockReturnValue(removeInterceptorMock);

      await plugin.setup(coreSetup);
      await plugin.stop();

      expect(removeInterceptorMock).toHaveBeenCalledTimes(1);
    });
  });
});
