/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MapsSetupApi } from '../../../maps/public';
import { AnomalySource } from './anomaly_source';
import { anomalyLayerWizard } from './anomaly_layer_wizard';

export const ML_ANOMALY = 'ML_ANOMALIES';

export function registerWithMaps(mapsSetupApi: MapsSetupApi) {
  mapsSetupApi.registerSource({
    type: ML_ANOMALY,
    ConstructorFunction: AnomalySource,
  });

  mapsSetupApi.registerLayerWizard(anomalyLayerWizard);
}
