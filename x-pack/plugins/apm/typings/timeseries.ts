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
  RecursivePartial,
  SeriesColorAccessorFn,
  SeriesColorsArray,
} from '@elastic/charts';
import { Maybe } from './common';

export interface Coordinate {
  x: number;
  y: Maybe<number>;
}

export interface BandCoordinate {
  x: number;
  y0: number | null;
  y1: number | null;
}

export interface RectCoordinate {
  x: number;
  x0: number;
}

type Accessor = Array<string | number | AccessorFn>;

export type TimeSeries<
  TCoordinate extends { x: number } =
    | Coordinate
    | RectCoordinate
    | BandCoordinate
> = APMChartSpec<TCoordinate>;

export interface APMChartSpec<
  TCoordinate extends { x: number } =
    | Coordinate
    | RectCoordinate
    | BandCoordinate
> {
  title: string;
  id?: string;
  titleShort?: string;
  hideLegend?: boolean;
  hideTooltipValue?: boolean;
  data: TCoordinate[];
  legendValue?: string;
  type: string;
  color: string | SeriesColorsArray | SeriesColorAccessorFn;
  areaColor?: string;
  fit?: Exclude<Fit, 'explicit'> | FitConfig;
  stackAccessors?: Accessor;
  yAccessors?: Accessor;
  y0Accessors?: Accessor;
  splitSeriesAccessors?: Accessor;
  markSizeAccessor?: string | AccessorFn;
  lineSeriesStyle?: RecursivePartial<LineSeriesStyle>;
  areaSeriesStyle?: RecursivePartial<AreaSeriesStyle>;
  groupId?: string;
}

export type ChartType = 'area' | 'linemark';
export type YUnit = 'percent' | 'bytes' | 'number' | 'time' | 'integer';
