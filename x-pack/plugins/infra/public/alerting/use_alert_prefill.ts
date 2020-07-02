/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate';
import { useMetricThresholdAlertPrefill } from './metric_threshold/hooks/use_metric_threshold_alert_prefill';
import { useInventoryAlertPrefill } from './inventory/hooks/use_inventory_alert_prefill';

const useAlertPrefill = () => {
  const metricThresholdPrefill = useMetricThresholdAlertPrefill();
  const inventoryPrefill = useInventoryAlertPrefill();

  return { metricThresholdPrefill, inventoryPrefill };
};

export const [AlertPrefillProvider, useAlertPrefillContext] = createContainer(useAlertPrefill);
