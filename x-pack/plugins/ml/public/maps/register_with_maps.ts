/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MapsStartApi } from '../../../maps/public';
import { AnomalySource } from './anomaly_source';
import { SOURCE_TYPES } from '../../../maps/common/constants';

export function registerWithMaps(mapsStartApi: MapsStartApi) {
  // eslint-disable-next-line no-console
  console.log('should register API with maps here', mapsStartApi);
  mapsStartApi.registerSource({
    type: SOURCE_TYPES.ML_ANOMALY,
    ConstructorFunction: AnomalySource,
  });

  mapsStartApi.registerLayerWizard()
}
