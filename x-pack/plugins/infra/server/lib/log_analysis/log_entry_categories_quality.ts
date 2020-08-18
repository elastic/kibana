/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { MlAnomalyDetectors, MlSystem } from '../../types';
import { startTracingSpan } from '../../../common/performance_tracing';
import { getJobId, logEntryCategoriesJobTypes } from '../../../common/log_analysis';

export async function getLogEntryCategoriesQuality(
  context: {
    infra: {
      mlAnomalyDetectors: MlAnomalyDetectors;
      mlSystem: MlSystem;
      spaceId: string;
    };
  },
  sourceId: string,
  startTime: number,
  endTime: number
) {
  const finalizeLogEntryCategoriesQuality = startTracingSpan('get categories quality data');

  const logEntryCategoriesCountJobId = getJobId(
    context.infra.spaceId,
    sourceId,
    logEntryCategoriesJobTypes[0]
  );

  const logEntryCategoriesQualitySpan = finalizeLogEntryCategoriesQuality();

  return {
    data: [],
    timing: {
      spans: [logEntryCategoriesQualitySpan],
    },
  };
}
