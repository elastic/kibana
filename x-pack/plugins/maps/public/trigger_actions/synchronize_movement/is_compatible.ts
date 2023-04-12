/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Embeddable as LensEmbeddable } from '@kbn/lens-plugin/public';
import { MAP_SAVED_OBJECT_TYPE } from '../../../common/constants';
import { isLegacyMap } from '../../legacy_visualizations/is_legacy_map';
import { mapEmbeddablesSingleton } from '../../embeddable/map_embeddables_singleton';
import type { SynchronizeMovementActionContext } from './types';

export function isCompatible({ embeddable }: SynchronizeMovementActionContext) {
  if (!mapEmbeddablesSingleton.hasMultipleMaps()) {
    return false;
  }

  if (
    embeddable.type === 'lens' &&
    typeof (embeddable as LensEmbeddable).getSavedVis === 'function' &&
    (embeddable as LensEmbeddable).getSavedVis()?.visualizationType === 'lnsChoropleth'
  ) {
    return true;
  }

  if (isLegacyMap(embeddable)) {
    return true;
  }

  return embeddable.type === MAP_SAVED_OBJECT_TYPE;
}
