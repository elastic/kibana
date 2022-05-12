/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  AGG_TYPE,
  APP_ID,
  COLOR_MAP_TYPE,
  DECIMAL_DEGREES_PRECISION,
  ES_GEO_FIELD_TYPE,
  FIELD_ORIGIN,
  INITIAL_LOCATION,
  LABEL_BORDER_SIZES,
  LAYER_TYPE,
  MAP_SAVED_OBJECT_TYPE,
  SCALING_TYPES,
  SOURCE_TYPES,
  STYLE_TYPE,
  SYMBOLIZE_AS_TYPES,
  LAYER_WIZARD_CATEGORY,
  MAX_ZOOM,
  MIN_ZOOM,
  VECTOR_SHAPE_TYPE,
  VECTOR_STYLES,
} from './constants';

export type { FieldFormatter } from './constants';

export type {
  EMSFileSourceDescriptor,
  ESTermSourceDescriptor,
  LayerDescriptor,
  TooltipFeature,
  VectorLayerDescriptor,
  VectorStyleDescriptor,
  VectorSourceRequestMeta,
} from './descriptor_types';
