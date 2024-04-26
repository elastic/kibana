/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReportInsightsGeneratedParams } from '../../../common/lib/telemetry/events/insights/types';
import { useKibana } from '../../../common/lib/kibana';

interface InsightsTelemetry {
  reportInsightsGenerated: (params: ReportInsightsGeneratedParams) => void;
}

// TODO @andrew implement this hook and call the reportInsightsGenerated function wherever insights are generated
export const useInsightsTelemetry = (): InsightsTelemetry => {
  const {
    services: { telemetry },
  } = useKibana();

  return {
    reportInsightsGenerated: telemetry.reportInsightsGenerated,
  };
};
