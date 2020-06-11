/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate';
import { useMetricThresholdAlertPrefill } from './metric_threshold/hooks/use_metric_threshold_alert_prefill';

const useAlertPrefill = () => {
  const metricThresholdPrefill = useMetricThresholdAlertPrefill();

  return { metricThresholdPrefill };
};

export const [AlertPrefillProvider, useAlertPrefillContext] = createContainer(useAlertPrefill);
