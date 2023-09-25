/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { DataViewOrigin } from '../../../../components/asset_details/types';
import type { MetricChartLayerParams, XYChartLayerParams } from '../../types';

type BaseProps = Pick<TypedLensByValueInput, 'id' | 'title' | 'overrides'>;

export interface AssetXYChartProps extends BaseProps {
  layers: XYChartLayerParams[];
}

export interface XYConfig extends AssetXYChartProps {
  dataViewOrigin: DataViewOrigin;
}

export interface KPIChartProps extends BaseProps {
  layers: MetricChartLayerParams;
  toolTip: string;
}
