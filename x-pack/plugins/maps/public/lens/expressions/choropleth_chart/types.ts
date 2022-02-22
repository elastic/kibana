/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LayerType } from '../../../../../lens/common';

export interface ChoroplethState {
  layerId: string;
  layerType: LayerType;
  emsLayerId: string;
  emsField: string;
  accessor: string;
  bucketColumnId: string;
  metricColumnId: string;
  isPreview: boolean;
}

export interface ChoroplethConfig extends ChoroplethState {
  title: string;
  description: string;
}