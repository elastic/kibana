/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { createWidgetFactory } from '@kbn/investigate-plugin/public';
import { ALERT_LOG_RATE_ANALYSIS_WIDGET_NAME } from './constants';

export const createInvestigateAlertLogRateAnalysisWidget = createWidgetFactory<{
  alertUuid: string;
  logRateQuery: QueryDslQueryContainer;
  indexPattern: string;
}>(ALERT_LOG_RATE_ANALYSIS_WIDGET_NAME);
