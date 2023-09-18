/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { DataViewOrigin } from '../../../../../../components/asset_details/types';
import type { XYChartLayerParams } from '../../../../types';

export type XYConfig = Pick<TypedLensByValueInput, 'id' | 'title' | 'overrides'> & {
  dataViewOrigin: DataViewOrigin;
  layers: XYChartLayerParams[];
};
