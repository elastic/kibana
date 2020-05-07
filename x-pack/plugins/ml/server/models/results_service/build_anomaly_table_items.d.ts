/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnomaliesTableRecord } from '../../../common/types/anomalies';

export function buildAnomalyTableItems(
  anomalyRecords: any,
  aggregationInterval: any,
  dateFormatTz: string
): AnomaliesTableRecord[];
