/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';
import { Orientation } from '@kbn/expression-tagcloud-plugin/common';
import type { SuggestionRequest, VisualizationSuggestion } from '../../types';
import type { TagcloudState } from './types';
import { TAGCLOUD_LABEL } from './constants';

export function suggestions({
  table,
  state,
  keptLayerIds,
  mainPalette,
  subVisualizationId,
}: SuggestionRequest<TagcloudState>): Array<VisualizationSuggestion<TagcloudState>> {
  const isUnchanged = state && table.changeType === 'unchanged';
  if (
    isUnchanged ||
    keptLayerIds.length > 1 ||
    (keptLayerIds.length && table.layerId !== keptLayerIds[0])
  ) {
    return [];
  }

  const [buckets, metrics] = partition(table.columns, (col) => col.operation.isBucketed);

  if (buckets.length !== 1 || metrics.length !== 1) {
    return [];
  }

  return buckets
    .filter((bucket) => {
      return bucket.operation.dataType !== 'date';
    })
    .map((bucket) => {
      return {
        title: TAGCLOUD_LABEL,
        score: 0.6,
        state: {
          layerId: table.layerId,
          tagAccessor: bucket.columnId,
          valueAccessor: metrics[0].columnId,
          maxFontSize: 72,
          minFontSize: 18,
          orientation: Orientation.SINGLE,
          showLabel: true,
        },
      };
    });
}
