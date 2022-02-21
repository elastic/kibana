/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { syncBoundsData } from './bounds_data';
export type { IVectorLayer, VectorLayerArguments } from './vector_layer';
export { isVectorLayer, NO_RESULTS_ICON_AND_TOOLTIPCONTENT } from './vector_layer';

export { BlendedVectorLayer } from './blended_vector_layer';
export { GeoJsonVectorLayer } from './geojson_vector_layer';
export { MvtVectorLayer, syncMvtSourceData } from './mvt_vector_layer';
export type { MvtSourceData } from './mvt_vector_layer';
