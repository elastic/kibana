/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { LensWrapperProps } from './lens_wrapper';

export type BaseChartProps = Pick<
  LensWrapperProps,
  | 'id'
  | 'dateRange'
  | 'disableTriggers'
  | 'filters'
  | 'hidePanelTitles'
  | 'lastReloadRequestTime'
  | 'loading'
  | 'overrides'
  | 'onBrushEnd'
  | 'query'
  | 'title'
> & {
  dataView?: DataView;
  height?: number;
};
