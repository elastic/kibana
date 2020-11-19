/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MVTFieldDescriptor } from '../../../../common/descriptor_types';

export interface MVTSingleLayerVectorSourceConfig {
  urlTemplate: string;
  layerName: string;
  minSourceZoom: number;
  maxSourceZoom: number;
  fields?: MVTFieldDescriptor[];
  tooltipProperties?: string[];
}
