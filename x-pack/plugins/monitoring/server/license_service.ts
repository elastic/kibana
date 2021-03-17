/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subscription } from 'rxjs';
import { ILegacyCustomClusterClient } from 'kibana/server';
import { ILicense, LicenseFeature } from '../../licensing/common/types';
import { LicensingPluginStart } from '../../licensing/server';
import { MonitoringConfig } from './config';
import { Logger } from '../../../../src/core/server';
import { MonitoringLicenseService } from './types';

interface SetupDeps {
  licensing: LicensingPluginStart;
  monitoringClient: ILegacyCustomClusterClient;
  config: MonitoringConfig;
  log: Logger;
}

const defaultLicenseFeature: LicenseFeature = {
  isAvailable: false,
  isEnabled: false,
};

export class LicenseService {
  public setup({ licensing, monitoringClient, config, log }: SetupDeps): MonitoringLicenseService {
    const { refresh, license$ } = licensing.createLicensePoller(
      monitoringClient,
      config.licensing.api_polling_frequency.asMilliseconds()
    );

    let rawLicense: Readonly<ILicense> | undefined;
    let licenseSubscription: Subscription | undefined = license$.subscribe((nextRawLicense) => {
      rawLicense = nextRawLicense;
      if (!rawLicense?.isAvailable) {
        log.warn(
          `X-Pack Monitoring Cluster Alerts will not be available: ${rawLicense?.getUnavailableReason()}`
        );
      }
    });

    return {
      refresh,
      license$,
      getMessage: () => rawLicense?.getUnavailableReason() || 'N/A',
      getMonitoringFeature: () => rawLicense?.getFeature('monitoring') || defaultLicenseFeature,
      getWatcherFeature: () => rawLicense?.getFeature('watcher') || defaultLicenseFeature,
      getSecurityFeature: () => rawLicense?.getFeature('security') || defaultLicenseFeature,
      stop: () => {
        if (licenseSubscription) {
          licenseSubscription.unsubscribe();
          licenseSubscription = undefined;
        }
      },
    };
  }
}
