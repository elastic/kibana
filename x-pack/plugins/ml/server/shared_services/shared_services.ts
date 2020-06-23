/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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

export type SharedServices = JobServiceProvider &
  AnomalyDetectorsProvider &
  MlSystemProvider &
  ModulesProvider &
  ResultsServiceProvider;

export function createSharedServices(
  mlLicense: MlServerLicense,
  spaces: SpacesPluginSetup | undefined,
  cloud: CloudSetup,
  resolveMlCapabilities: ResolveMlCapabilities
): SharedServices {
  const { isFullLicense, isMinimumLicense } = licenseChecks(mlLicense);

  return {
    ...getJobServiceProvider(isFullLicense),
    ...getAnomalyDetectorsProvider(isFullLicense),
    ...getMlSystemProvider(
      isMinimumLicense,
      isFullLicense,
      mlLicense,
      spaces,
      cloud,
      resolveMlCapabilities
    ),
    ...getModulesProvider(isFullLicense),
    ...getResultsServiceProvider(isFullLicense),
  };
}
