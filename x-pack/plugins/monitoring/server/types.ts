/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Observable } from 'rxjs';
import { IRouter, IClusterClient, Logger } from 'kibana/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { TelemetryCollectionManagerPluginSetup } from 'src/plugins/telemetry_collection_manager/server';
import { LicenseFeature, ILicense } from '../../licensing/server';
import { PluginStartContract as ActionsPluginsStartContact } from '../../actions/server';
import {
  PluginStartContract as AlertingPluginStartContract,
  PluginSetupContract as AlertingPluginSetupContract,
} from '../../alerts/server';
import { InfraPluginSetup } from '../../infra/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { PluginSetupContract as FeaturesPluginSetupContract } from '../../features/server';

export interface MonitoringLicenseService {
  refresh: () => Promise<any>;
  license$: Observable<ILicense>;
  getMessage: () => string | undefined;
  getWatcherFeature: () => LicenseFeature;
  getMonitoringFeature: () => LicenseFeature;
  getSecurityFeature: () => LicenseFeature;
  stop: () => void;
}
