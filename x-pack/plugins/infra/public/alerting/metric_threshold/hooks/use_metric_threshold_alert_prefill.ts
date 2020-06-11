/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState } from 'react';
import { MetricsExplorerMetric } from '../../../../common/http_api/metrics_explorer';

export const useMetricThresholdAlertPrefill = () => {
  const [groupBy, setGroupBy] = useState<string | string[] | undefined>();
  const [filterQuery, setFilterQuery] = useState<string | undefined>();
  const [metrics, setMetrics] = useState<MetricsExplorerMetric[]>([]);

  return {
    groupBy,
    filterQuery,
    metrics,
    setGroupBy,
    setFilterQuery,
    setMetrics,
  };
};
