/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnomalyRecordDoc } from '../../../../../legacy/plugins/ml/common/types/anomalies';

export interface AnomaliesTableRecord {
  time: number;
  source: AnomalyRecordDoc;
  rowId: string;
  jobId: string;
  detectorIndex: number;
  severity: number;
  entityName?: string;
  entityValue?: any;
  influencers?: Array<{ [key: string]: any }>;
  actual?: number[];
  actualSort?: any;
  typical?: number[];
  typicalSort?: any;
  metricDescriptionSort?: number;
}

export function buildAnomalyTableItems(
  anomalyRecords: any,
  aggregationInterval: any,
  dateFormatTz: string
): AnomaliesTableRecord[];
