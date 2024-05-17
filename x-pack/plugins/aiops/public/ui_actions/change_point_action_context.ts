/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMBEDDABLE_CHANGE_POINT_CHART_TYPE } from '@kbn/aiops-change-point-detection/constants';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { type EmbeddableApiContext, apiIsOfType } from '@kbn/presentation-publishing';
import type { ChangePointEmbeddableApi } from '../embeddables/change_point_chart/types';

export interface ChangePointChartActionContext extends EmbeddableApiContext {
  embeddable: ChangePointEmbeddableApi;
}

export function isChangePointChartEmbeddableContext(
  arg: unknown
): arg is ChangePointChartActionContext {
  return (
    isPopulatedObject(arg, ['embeddable']) &&
    apiIsOfType(arg.embeddable, EMBEDDABLE_CHANGE_POINT_CHART_TYPE)
  );
}
