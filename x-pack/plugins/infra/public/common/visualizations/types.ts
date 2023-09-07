/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MetricLayerConfig,
  XYLayerConfig,
  XYReferenceLinesLayerConfig,
} from '@kbn/lens-embeddable-utils';
import { hostLensFormulas } from './constants';

export type HostsLensFormulas = keyof typeof hostLensFormulas;
export type HostsLensMetricChartFormulas = Exclude<HostsLensFormulas, 'diskIORead' | 'diskIOWrite'>;
export type HostsLensLineChartFormulas = Exclude<HostsLensFormulas, 'hostCount'>;

export type XYChartLayerParams =
  | (XYLayerConfig & { type: 'visualization' })
  | (XYReferenceLinesLayerConfig & { type: 'referenceLines' });

export type MetricChartLayerParams = MetricLayerConfig & { type: 'visualization' };
