/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MapsStartApi } from '../../../maps/public';
import { AnomalySource } from './anomaly_source';
import { SOURCE_TYPES } from '../../../maps/common/constants';
import { anomalyLayerWizard } from './anomaly_layer_wizard';

export function registerWithMaps(mapsStartApi: MapsStartApi) {
  mapsStartApi.registerSource({
    type: SOURCE_TYPES.ML_ANOMALY,
    ConstructorFunction: AnomalySource,
  });

  mapsStartApi.registerLayerWizard(anomalyLayerWizard);
}
