/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmMlDetectorType } from '../../../common/anomaly_detection/apm_ml_detectors';
import { apmMlAnomalyQuery } from './apm_ml_anomaly_query';

export function apmMlTransactionAnomalyQuery({
  serviceName,
  transactionType,
  detectorTypes,
}: {
  serviceName?: string;
  detectorTypes?: ApmMlDetectorType[];
  transactionType?: string;
}) {
  return apmMlAnomalyQuery({
    partitionField: serviceName,
    byField: transactionType,
    detectorTypes,
  });
}
