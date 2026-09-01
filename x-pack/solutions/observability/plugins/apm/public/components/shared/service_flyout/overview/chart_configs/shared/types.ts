/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { LensConfig, LensSeriesLayer } from '@kbn/lens-embeddable-utils';
import type { LensESQLConfig } from '../../types';

export type FlyoutLensChartProcessorEvent = 'transaction' | 'metric';

export interface FlyoutLensChartConfigDefinition {
  id: string;
  title: string;
  titleAction?: ReactNode;
  config?: LensESQLConfig;
}

export interface ServiceScope {
  serviceName: string;
  environment: string;
}

export interface EcsServiceScope extends ServiceScope {
  transactionType: string;
}

export type LensYAxis = LensSeriesLayer['yAxis'][number];
export type LensYBounds = Extract<LensConfig, { chartType: 'xy' }>['yBounds'];
