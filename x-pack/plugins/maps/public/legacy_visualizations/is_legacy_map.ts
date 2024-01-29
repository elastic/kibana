/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HasType } from '@kbn/presentation-publishing';
import { Embeddable } from '@kbn/embeddable-plugin/public';
import type { HasVisualizeConfig, VisualizeEmbeddable } from '@kbn/visualizations-plugin/public';
import { apiHasVisualizeConfig } from '@kbn/visualizations-plugin/public';

export function isLegacyMap(embeddable: Embeddable) {
  return (
    embeddable.type === 'visualization' &&
    typeof (embeddable as VisualizeEmbeddable).getVis === 'function' &&
    ['region_map', 'tile_map'].includes((embeddable as VisualizeEmbeddable).getVis()?.type?.name)
  );
}

type LegacyMapApi = HasType & Partial<HasVisualizeConfig>;

export function isLegacyMapApi(api: LegacyMapApi) {
  if (api.type !== 'visualization' || !apiHasVisualizeConfig(api)) {
    return false;
  }
  return ['region_map', 'tile_map'].includes(api.getVis().type?.name);
}
