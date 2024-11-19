/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { apiIsOfType, type EmbeddableApiContext } from '@kbn/presentation-publishing';
import { EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE } from '@kbn/aiops-log-rate-analysis/constants';
import type { LogRateAnalysisEmbeddableApi } from '../embeddables/log_rate_analysis/types';

export interface LogRateAnalysisActionContext extends EmbeddableApiContext {
  embeddable: LogRateAnalysisEmbeddableApi;
}

export function isLogRateAnalysisEmbeddableContext(
  arg: unknown
): arg is LogRateAnalysisActionContext {
  return (
    isPopulatedObject(arg, ['embeddable']) &&
    apiIsOfType(arg.embeddable, EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE)
  );
}
