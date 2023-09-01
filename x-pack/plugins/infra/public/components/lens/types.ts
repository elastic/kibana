/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { LensAttributes } from '@kbn/lens-embeddable-utils';
import { LensEmbeddableInput, TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { Action } from '@kbn/ui-actions-plugin/public';

export type LensWrapperProps = Omit<
  TypedLensByValueInput,
  'timeRange' | 'attributes' | 'viewMode'
> & {
  attributes: LensAttributes | null;
  dateRange: TimeRange;
  extraActions: Action[];
  loading?: boolean;
};

export type BrushEndArgs = Parameters<NonNullable<LensEmbeddableInput['onBrushEnd']>>[0];

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
