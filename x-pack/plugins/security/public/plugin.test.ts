/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock } from 'src/core/public/mocks';
import { BehaviorSubject } from 'rxjs';
import { ILicense, LicensingPluginSetup } from '../../licensing/public';
import { SecurityPlugin } from './plugin';
import { nextTick } from 'test_utils/enzyme_helpers';

jest.mock('broadcast-channel');

const validLicense = {
  isAvailable: true,
  getFeature: feature => {
    expect(feature).toEqual('security');

    return {
      isAvailable: true,
      isEnabled: true,
    };
  },
  isOneOf: (...candidates) => true,
} as ILicense;

describe('SecurityPlugin', () => {
  describe('#start', () => {
    it('should register the nav control once the license supports it', async () => {
      const license$ = new BehaviorSubject<ILicense>({} as ILicense);
      const securityPlugin = new SecurityPlugin();

      const coreSetup = coreMock.createSetup();
      securityPlugin.setup(coreSetup, {
        licensing: ({ license$ } as unknown) as LicensingPluginSetup,
      });

      const coreStart = coreMock.createStart();
      securityPlugin.start(coreStart);

      expect(coreStart.chrome.navControls.registerRight).not.toHaveBeenCalled();

      license$.next(validLicense);

      await nextTick();

      expect(coreStart.chrome.navControls.registerRight).toHaveBeenCalled();
    });

    it('should not register the nav control for anonymous paths', async () => {
      const license$ = new BehaviorSubject<ILicense>(validLicense);
      const securityPlugin = new SecurityPlugin();

      const coreSetup = coreMock.createSetup();

      securityPlugin.setup(coreSetup, {
        licensing: ({ license$ } as unknown) as LicensingPluginSetup,
      });

      const coreStart = coreMock.createStart();
      coreStart.http.anonymousPaths.isAnonymous.mockReturnValue(true);
      securityPlugin.start(coreStart);

      expect(coreStart.chrome.navControls.registerRight).not.toHaveBeenCalled();
    });

    it('should only register the nav control once', async () => {
      const license$ = new BehaviorSubject<ILicense>(validLicense);
      const securityPlugin = new SecurityPlugin();

      const coreSetup = coreMock.createSetup();

      securityPlugin.setup(coreSetup, {
        licensing: ({ license$ } as unknown) as LicensingPluginSetup,
      });

      const coreStart = coreMock.createStart();
      securityPlugin.start(coreStart);

      expect(coreStart.chrome.navControls.registerRight).toHaveBeenCalledTimes(1);

      // trigger license change
      license$.next({} as ILicense);
      await nextTick();
      license$.next(validLicense);
      await nextTick();

      expect(coreStart.chrome.navControls.registerRight).toHaveBeenCalledTimes(1);
    });
  });
});
