/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RevealImageState as RevealImageStateOriginal } from '@kbn/expression-reveal-image-plugin/common';
import type { LayerType } from '../../../common/types';

export const LENS_REVEAL_IMAGE_ID = 'lnsRevealImage';

export const GROUP_ID = {
  METRIC: 'metric',
  MAX: 'max',
  IMAGE: 'image',
  EMPTY_IMAGE: 'emptyImage',
  GOAL: 'origin',
} as const;

type RevealImageState = Pick<
  RevealImageStateOriginal,
  'metric' | 'image' | 'emptyImage' | 'origin'
> & {
  maxAccessor?: string;
  metricAccessor?: string;
  imageId: string | null;
  emptyImageId: string | null;
};

export type RevealImageVisualizationState = RevealImageState & {
  layerId: string;
  layerType: LayerType;
};

export type RevealImageExpressionState = RevealImageState & {
  layerId: string;
  layerType: LayerType;
};
