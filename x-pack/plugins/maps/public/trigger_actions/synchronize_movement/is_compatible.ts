/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiIsOfType } from '@kbn/presentation-publishing';
import { apiHasVisualizeConfig } from '@kbn/visualizations-plugin/public';
import { isLensApi } from '@kbn/lens-plugin/public';
import { MAP_SAVED_OBJECT_TYPE } from '../../../common/constants';
import { isLegacyMapApi } from '../../legacy_visualizations/is_legacy_map';
import { mapEmbeddablesSingleton } from '../../embeddable/map_embeddables_singleton';
import type { SynchronizeMovementActionApi } from './types';

export function isCompatible(api: SynchronizeMovementActionApi) {
  if (!mapEmbeddablesSingleton.hasMultipleMaps()) {
    return false;
  }
  return (
    apiIsOfType(api, MAP_SAVED_OBJECT_TYPE) ||
    (isLensApi(api) && api.getSavedVis()?.visualizationType === 'lnsChoropleth') ||
    (apiHasVisualizeConfig(api) && isLegacyMapApi(api))
  );
}
