/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { XYDataLayerConfig } from './data_layer_config';
import { XYReferenceLineLayerConfig } from './reference_line_layer_config';
import { XYAnnotationLayerConfig } from './annotation_layer_config';
export * from './data_layer_config';
export * from './reference_line_layer_config';
export * from './annotation_layer_config';

export type XYLayerConfig =
  | XYDataLayerConfig
  | XYReferenceLineLayerConfig
  | XYAnnotationLayerConfig;
