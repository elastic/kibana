/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'kibana/server';
import { MlServerLicense } from '../lib/license';

import { SpacesPluginSetup } from '../../../spaces/server';
import { CloudSetup } from '../../../cloud/server';
import { licenseChecks } from './license_checks';
import { MlSystemProvider, getMlSystemProvider } from './providers/system';
import { JobServiceProvider, getJobServiceProvider } from './providers/job_service';
import { ModulesProvider, getModulesProvider } from './providers/modules';
import { ResultsServiceProvider, getResultsServiceProvider } from './providers/results_service';
import {
  AnomalyDetectorsProvider,
  getAnomalyDetectorsProvider,
} from './providers/anomaly_detectors';
import { ResolveMlCapabilities } from '../../common/types/capabilities';
import { hasMlCapabilitiesProvider, HasMlCapabilities } from '../lib/capabilities';

export type SharedServices = JobServiceProvider &
  AnomalyDetectorsProvider &
  MlSystemProvider &
  ModulesProvider &
  ResultsServiceProvider;

export interface SharedServicesChecks {
  isFullLicense(): void;
  isMinimumLicense(): void;
  getHasMlCapabilities(request: KibanaRequest): HasMlCapabilities;
}

export function createSharedServices(
  mlLicense: MlServerLicense,
  spaces: SpacesPluginSetup | undefined,
  cloud: CloudSetup,
  resolveMlCapabilities: ResolveMlCapabilities
): SharedServices {
  const { isFullLicense, isMinimumLicense } = licenseChecks(mlLicense);
  const getHasMlCapabilities = hasMlCapabilitiesProvider(resolveMlCapabilities);
  const checks: SharedServicesChecks = {
    isFullLicense,
    isMinimumLicense,
    getHasMlCapabilities,
  };

  return {
    ...getJobServiceProvider(checks),
    ...getAnomalyDetectorsProvider(checks),
    ...getModulesProvider(checks),
    ...getResultsServiceProvider(checks),
    ...getMlSystemProvider(checks, mlLicense, spaces, cloud, resolveMlCapabilities),
  };
}
