/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useCustomThresholdAlertPrefill } from '../hooks/use_metric_threshold_alert_prefill';

const useAlertPrefill = () => {
  const customThresholdPrefill = useCustomThresholdAlertPrefill();
  return { customThresholdPrefill };
};

export const [AlertPrefillProvider, useAlertPrefillContext] = createContainer(useAlertPrefill);
