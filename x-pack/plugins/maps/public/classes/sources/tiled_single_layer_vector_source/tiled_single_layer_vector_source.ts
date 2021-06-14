/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { VectorSourceRequestMeta } from '../../../../common/descriptor_types';
import { IVectorSource } from '../vector_source';

export interface ITiledSingleLayerMvtParams {
  layerName: string;
  urlTemplate: string;
  minSourceZoom: number;
  maxSourceZoom: number;
  refreshTokenParamName?: string;
}

export interface ITiledSingleLayerVectorSource extends IVectorSource {
  getUrlTemplateWithMeta(
    searchFilters: VectorSourceRequestMeta
  ): Promise<ITiledSingleLayerMvtParams>;
  getMinZoom(): number;
  getMaxZoom(): number;
  getLayerName(): string;
}
