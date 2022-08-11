/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import { take, toArray } from 'rxjs/operators';
import { mountExpiredBannerMock } from './plugin.test.mocks';

import { LicenseType } from '../common/types';
import { LicensingPlugin, licensingSessionStorageKey } from './plugin';

import { License } from '../common/license';
import { licenseMock } from '../common/licensing.mock';
import { coreMock } from '@kbn/core/public/mocks';
import { HttpInterceptor } from '@kbn/core/public';

const coreStart = coreMock.createStart();
describe('licensing plugin', () => {
  let plugin: LicensingPlugin;

  afterEach(async () => {
    jest.clearAllMocks();
    await plugin.stop();
  });

  describe('#start', () => {
    describe('#refresh', () => {
      it('forces data re-fetch', async () => {
        const sessionStorage = coreMock.createStorage();
        plugin = new LicensingPlugin(coreMock.createPluginInitializerContext(), sessionStorage);

        const coreSetup = coreMock.createSetup();
        const firstLicense = licenseMock.createLicense({
          license: { uid: 'first', type: 'basic' },
        });
        const secondLicense = licenseMock.createLicense({
          license: { uid: 'second', type: 'gold' },
        });
        coreSetup.http.get.mockResolvedValueOnce(firstLicense).mockResolvedValueOnce(secondLicense);

        await plugin.setup(coreSetup);
        const { license$, refresh } = await plugin.start(coreStart);

        let fromObservable;
        license$.subscribe((license) => (fromObservable = license));

        const licenseResult = await refresh();
        expect(licenseResult.uid).toBe('first');
        expect(licenseResult).toBe(fromObservable);

        const secondResult = await refresh();
        expect(secondResult.uid).toBe('second');
        expect(secondResult).toBe(fromObservable);
      });

      it('data re-fetch call marked as a system api', async () => {
        const sessionStorage = coreMock.createStorage();
        plugin = new LicensingPlugin(coreMock.createPluginInitializerContext(), sessionStorage);

        const coreSetup = coreMock.createSetup();
        const fetchedLicense = licenseMock.createLicense();
        coreSetup.http.get.mockResolvedValue(fetchedLicense);

        await plugin.setup(coreSetup);
        const { refresh } = await plugin.start(coreStart);

        await refresh();

        expect(coreSetup.http.get.mock.calls[0][0]).toMatchObject({
          asSystemRequest: true,
        });
      });
    });

    describe('#license$', () => {
      it('starts with license saved in sessionStorage if available', async () => {
        const sessionStorage = coreMock.createStorage();
        const savedLicense = licenseMock.createLicense({ license: { uid: 'saved' } });
        sessionStorage.getItem.mockReturnValue(JSON.stringify(savedLicense));
        plugin = new LicensingPlugin(coreMock.createPluginInitializerContext(), sessionStorage);

        const coreSetup = coreMock.createSetup();
        await plugin.setup(coreSetup);
        const { license$ } = await plugin.start(coreStart);

        const license = await firstValueFrom(license$);
        expect(license.isAvailable).toBe(true);
        expect(license.uid).toBe('saved');

        expect(sessionStorage.getItem).toBeCalledTimes(1);
        expect(sessionStorage.getItem).toHaveBeenCalledWith(licensingSessionStorageKey);
      });

      it('observable receives updated licenses', async () => {
        const types: LicenseType[] = ['gold', 'platinum'];

        const sessionStorage = coreMock.createStorage();
        sessionStorage.getItem.mockReturnValue(JSON.stringify(licenseMock.createLicense()));
        plugin = new LicensingPlugin(coreMock.createPluginInitializerContext(), sessionStorage);

        const coreSetup = coreMock.createSetup();
        coreSetup.http.get.mockImplementation(() =>
          Promise.resolve(licenseMock.createLicense({ license: { type: types.shift() } }))
        );

        plugin.setup(coreSetup);
        const { refresh, license$ } = await plugin.start(coreStart);
        const promise = firstValueFrom(license$.pipe(take(3), toArray()));

        await refresh();
        await refresh();

        const licenses = await promise;
        expect(licenses[0].type).toBe('basic');
        expect(licenses[1].type).toBe('gold');
        expect(licenses[2].type).toBe('platinum');
      });

      it('saved fetched license & signature in session storage', async () => {
        const sessionStorage = coreMock.createStorage();
        plugin = new LicensingPlugin(coreMock.createPluginInitializerContext(), sessionStorage);

        const coreSetup = coreMock.createSetup();

        const fetchedLicense = licenseMock.createLicense({ license: { uid: 'fresh' } });
        coreSetup.http.get.mockResolvedValue(fetchedLicense);

        await plugin.setup(coreSetup);
        const { license$, refresh } = await plugin.start(coreStart);

        await refresh();
        const license = await firstValueFrom(license$);

        expect(license.uid).toBe('fresh');

        expect(sessionStorage.setItem).toBeCalledTimes(1);

        expect(sessionStorage.setItem.mock.calls[0][0]).toBe(licensingSessionStorageKey);
        expect(sessionStorage.setItem.mock.calls[0][1]).toMatchInlineSnapshot(
          `"{\\"license\\":{\\"uid\\":\\"fresh\\",\\"status\\":\\"active\\",\\"type\\":\\"basic\\",\\"mode\\":\\"basic\\",\\"expiryDateInMillis\\":5000},\\"features\\":{\\"ccr\\":{\\"isEnabled\\":true,\\"isAvailable\\":true},\\"ml\\":{\\"isEnabled\\":false,\\"isAvailable\\":true}},\\"signature\\":\\"xxxxxxxxx\\"}"`
        );

        const saved = JSON.parse(sessionStorage.setItem.mock.calls[0][1]);
        expect(License.fromJSON(saved).toJSON()).toEqual(fetchedLicense.toJSON());
      });

      it('returns a license with error when request fails', async () => {
        const sessionStorage = coreMock.createStorage();
        plugin = new LicensingPlugin(coreMock.createPluginInitializerContext(), sessionStorage);

        const coreSetup = coreMock.createSetup();
        coreSetup.http.get.mockRejectedValue(new Error('reason'));

        await plugin.setup(coreSetup);
        const { license$, refresh } = await plugin.start(coreStart);
        await refresh();

        const license = await firstValueFrom(license$);

        expect(license.isAvailable).toBe(false);
        expect(license.error).toBe('reason');
      });

      it('remove license saved in session storage when request failed', async () => {
        const sessionStorage = coreMock.createStorage();
        plugin = new LicensingPlugin(coreMock.createPluginInitializerContext(), sessionStorage);

        const coreSetup = coreMock.createSetup();
        coreSetup.http.get.mockRejectedValue(new Error('sorry'));

        await plugin.setup(coreSetup);
        const { license$, refresh } = await plugin.start(coreStart);
        expect(sessionStorage.removeItem).toHaveBeenCalledTimes(0);

        await refresh();
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

      coreSetup.http.get.mockResolvedValue(licenseMock.createLicense({ signature: 'signature-1' }));

      let registeredInterceptor: HttpInterceptor;
      coreSetup.http.intercept.mockImplementation((interceptor: HttpInterceptor) => {
        registeredInterceptor = interceptor;
        return () => undefined;
      });

      await plugin.setup(coreSetup);
      const { license$ } = await plugin.start(coreStart);
      expect(registeredInterceptor!.response).toBeDefined();

      const httpResponse = {
        response: {
          headers: {
            get(name: string) {
              if (name === 'kbn-license-sig') {
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

      const license = await firstValueFrom(license$);
      expect(license.isAvailable).toBe(true);

      await registeredInterceptor!.response!(httpResponse as any, null as any);

      expect(coreSetup.http.get).toHaveBeenCalledTimes(1);
    });

    it('http interceptor does not trigger re-fetch if signature header is not present', async () => {
      const sessionStorage = coreMock.createStorage();
      plugin = new LicensingPlugin(coreMock.createPluginInitializerContext(), sessionStorage);

      const coreSetup = coreMock.createSetup();

      coreSetup.http.get.mockResolvedValue(licenseMock.createLicense({ signature: 'signature-1' }));

      let registeredInterceptor: HttpInterceptor;
      coreSetup.http.intercept.mockImplementation((interceptor: HttpInterceptor) => {
        registeredInterceptor = interceptor;
        return () => undefined;
      });

      await plugin.setup(coreSetup);
      await plugin.start(coreStart);
      expect(registeredInterceptor!.response).toBeDefined();

      const httpResponse = {
        response: {
          headers: {
            get(name: string) {
              if (name === 'kbn-license-sig') {
                return undefined;
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

      expect(coreSetup.http.get).toHaveBeenCalledTimes(0);
    });

    it('http interceptor does not trigger license re-fetch for anonymous pages', async () => {
      const sessionStorage = coreMock.createStorage();
      plugin = new LicensingPlugin(coreMock.createPluginInitializerContext(), sessionStorage);

      const coreSetup = coreMock.createSetup();
      coreSetup.http.anonymousPaths.isAnonymous.mockReturnValue(true);

      let registeredInterceptor: HttpInterceptor;
      coreSetup.http.intercept.mockImplementation((interceptor: HttpInterceptor) => {
        registeredInterceptor = interceptor;
        return () => undefined;
      });

      await plugin.setup(coreSetup);
      const httpResponse = {
        response: {
          headers: {
            get(name: string) {
              if (name === 'kbn-license-sig') {
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
      await registeredInterceptor!.response!(httpResponse as any, null as any);

      expect(coreSetup.http.get).toHaveBeenCalledTimes(0);
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

      await plugin.setup(coreSetup);
      const { license$ } = await plugin.start(coreStart);

      let updated = false;
      license$.subscribe(() => (updated = true));

      expect(registeredInterceptor!.response).toBeDefined();

      const httpResponse = {
        response: {
          headers: {
            get(name: string) {
              if (name === 'kbn-license-sig') {
                return 'signature-1';
              }
              throw new Error('unexpected header');
            },
          },
        },
        request: {
          url: 'http://10.10.10.10:5601/api/licensing/info',
        },
      };
      expect(coreSetup.http.get).toHaveBeenCalledTimes(0);

      await registeredInterceptor!.response!(httpResponse as any, null as any);

      expect(coreSetup.http.get).toHaveBeenCalledTimes(0);

      expect(updated).toBe(false);
    });
  });

  describe('expired banner', () => {
    it('does not show "license expired" banner if license is not expired.', async () => {
      const sessionStorage = coreMock.createStorage();
      plugin = new LicensingPlugin(coreMock.createPluginInitializerContext(), sessionStorage);

      const coreSetup = coreMock.createSetup();
      coreSetup.http.get.mockResolvedValueOnce(
        licenseMock.createLicense({ license: { status: 'active', type: 'gold' } })
      );

      await plugin.setup(coreSetup);
      const { refresh } = await plugin.start(coreStart);

      await refresh();
      expect(coreStart.overlays.banners.add).toHaveBeenCalledTimes(0);
    });

    it('shows "license expired" banner if license is expired only once.', async () => {
      const sessionStorage = coreMock.createStorage();
      plugin = new LicensingPlugin(coreMock.createPluginInitializerContext(), sessionStorage);

      const coreSetup = coreMock.createSetup();
      const activeLicense = licenseMock.createLicense({
        license: { status: 'active', type: 'gold' },
      });
      const expiredLicense = licenseMock.createLicense({
        license: { status: 'expired', type: 'gold' },
      });
      coreSetup.http.get
        .mockResolvedValueOnce(activeLicense)
        .mockResolvedValueOnce(expiredLicense)
        .mockResolvedValueOnce(activeLicense)
        .mockResolvedValueOnce(expiredLicense);

      await plugin.setup(coreSetup);
      const { refresh } = await plugin.start(coreStart);

      await refresh();
      expect(coreStart.overlays.banners.add).toHaveBeenCalledTimes(0);
      await refresh();
      expect(coreStart.overlays.banners.add).toHaveBeenCalledTimes(1);
      await refresh();
      expect(coreStart.overlays.banners.add).toHaveBeenCalledTimes(1);
      await refresh();
      expect(coreStart.overlays.banners.add).toHaveBeenCalledTimes(1);
      expect(mountExpiredBannerMock).toHaveBeenCalledWith({
        type: 'gold',
        uploadUrl: '/app/management/stack/license_management/upload_license',
      });
    });
  });

  describe('#stop', () => {
    it('stops polling', async () => {
      const sessionStorage = coreMock.createStorage();
      plugin = new LicensingPlugin(coreMock.createPluginInitializerContext(), sessionStorage);
      const coreSetup = coreMock.createSetup();
      await plugin.setup(coreSetup);
      const { license$ } = await plugin.start(coreStart);

      let completed = false;
      license$.subscribe({ complete: () => (completed = true) });

      await plugin.stop();
      expect(completed).toBe(true);
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
