/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin } from 'kibana/public';
import { LicensingPluginSetup, ILicense } from '../../licensing/public';

/**
 * These are the interfaces with your public contracts. You should export these
 * for other plugins to use in _their_ `SetupDeps`/`StartDeps` interfaces.
 * @public
 */

export interface MapsLegacyLicensingSetupDependencies {
  licensing: LicensingPluginSetup;
  mapsLegacy: any;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MapsLegacyLicensingStartDependencies {}

export type MapsLegacyLicensingSetup = ReturnType<MapsLegacyLicensing['setup']>;
export type MapsLegacyLicensingStart = ReturnType<MapsLegacyLicensing['start']>;

export class MapsLegacyLicensing
  implements Plugin<MapsLegacyLicensingSetup, MapsLegacyLicensingStart> {
  public setup(core: CoreSetup, plugins: MapsLegacyLicensingSetupDependencies) {
    const { licensing, mapsLegacy } = plugins;
    if (licensing) {
      licensing.license$.subscribe(async (license: ILicense) => {
        const serviceSettings = await mapsLegacy.getServiceSettings();
        const { uid, isActive } = license;
        if (isActive && license.hasAtLeast('basic')) {
          serviceSettings.setQueryParams({ license: uid });
          serviceSettings.disableZoomMessage();
        } else {
          serviceSettings.setQueryParams({ license: undefined });
          serviceSettings.enableZoomMessage();
        }
      });
    }
  }

  public start(core: CoreStart, plugins: MapsLegacyLicensingStartDependencies) {}
}
