/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MapsSetupApi } from '@kbn/maps-plugin/public';
import type { MlCoreSetup } from '../plugin';
import { AnomalySourceFactory } from './anomaly_source_factory';
import { AnomalyLayerWizardFactory } from './anomaly_layer_wizard_factory';

export async function registerMapExtension(
  mapsSetupApi: MapsSetupApi,
  core: MlCoreSetup,
  { canGetJobs, canCreateJobs }: { canGetJobs: boolean; canCreateJobs: boolean }
) {
  const anomalySourceFactory = new AnomalySourceFactory(core.getStartServices, canGetJobs);
  const anomalyLayerWizardFactory = new AnomalyLayerWizardFactory(
    core.getStartServices,
    canGetJobs,
    canCreateJobs
  );
  const anomalylayerWizard = await anomalyLayerWizardFactory.create();

  mapsSetupApi.registerSource({
    type: anomalySourceFactory.type,
    ConstructorFunction: await anomalySourceFactory.create(),
  });

  mapsSetupApi.registerLayerWizard(anomalylayerWizard);
}
