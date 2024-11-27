/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewsService } from '@kbn/data-views-plugin/server';
import {
  ApmTransactionDurationTransformGenerator,
  ApmTransactionErrorRateTransformGenerator,
  HistogramTransformGenerator,
  KQLCustomTransformGenerator,
  MetricCustomTransformGenerator,
  SyntheticsAvailabilityTransformGenerator,
  TimesliceMetricTransformGenerator,
  TransformGenerator,
} from '.';
import { IndicatorTypes } from '../../domain/models';

export function createTransformGenerators(
  spaceId: string,
  dataViewsService: DataViewsService,
  isServerless: boolean
): Record<IndicatorTypes, TransformGenerator> {
  return {
    'sli.apm.transactionDuration': new ApmTransactionDurationTransformGenerator(
      spaceId,
      dataViewsService
    ),
    'sli.apm.transactionErrorRate': new ApmTransactionErrorRateTransformGenerator(
      spaceId,
      dataViewsService
    ),
    'sli.synthetics.availability': new SyntheticsAvailabilityTransformGenerator(
      spaceId,
      dataViewsService,
      isServerless
    ),
    'sli.kql.custom': new KQLCustomTransformGenerator(spaceId, dataViewsService),
    'sli.metric.custom': new MetricCustomTransformGenerator(spaceId, dataViewsService),
    'sli.histogram.custom': new HistogramTransformGenerator(spaceId, dataViewsService),
    'sli.metric.timeslice': new TimesliceMetricTransformGenerator(spaceId, dataViewsService),
  };
}
