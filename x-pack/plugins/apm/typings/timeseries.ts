/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AccessorFn,
  AreaSeriesStyle,
  Fit,
  FitConfig,
  LineSeriesStyle,
} from '@elastic/charts';
import { DeepPartial } from 'utility-types';
import { Maybe } from '../typings/common';

export interface Coordinate {
  x: number;
  y: Maybe<number>;
}

export interface RectCoordinate {
  x: number;
  x0: number;
}

type Accessor = Array<string | number | AccessorFn>;

export type TimeSeries<
  TCoordinate extends { x: number } = Coordinate | RectCoordinate
> = APMChartSpec<TCoordinate>;

export interface APMChartSpec<
  TCoordinate extends { x: number } = Coordinate | RectCoordinate
> {
  title: string;
  titleShort?: string;
  hideLegend?: boolean;
  hideTooltipValue?: boolean;
  data: TCoordinate[];
  legendValue?: string;
  type: string;
  color: string;
  areaColor?: string;
  fit?: Exclude<Fit, 'explicit'> | FitConfig;
  stackAccessors?: Accessor;
  splitSeriesAccessors?: Accessor;
  lineSeriesStyle?: DeepPartial<LineSeriesStyle>;
  areaSeriesStyle?: DeepPartial<AreaSeriesStyle>;
}

export type ChartType = 'area' | 'linemark';
export type YUnit = 'percent' | 'bytes' | 'number' | 'time' | 'integer';
