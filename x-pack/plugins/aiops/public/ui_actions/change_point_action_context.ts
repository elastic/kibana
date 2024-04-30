/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { apiIsOfType } from '@kbn/presentation-publishing';
import { EMBEDDABLE_CHANGE_POINT_CHART_TYPE } from '@kbn/aiops-change-point-detection/constants';
import type { OpenInMLUIActionContext } from './open_change_point_ml';

export function isChangePointChartEmbeddableContext(arg: unknown): arg is OpenInMLUIActionContext {
  return (
    isPopulatedObject(arg, ['embeddable']) &&
    apiIsOfType(arg.embeddable, EMBEDDABLE_CHANGE_POINT_CHART_TYPE)
  );
}
