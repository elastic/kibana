/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertTypeParams } from '../../../../alerts/common';

export interface Comparator {
  text: string;
  value: string;
  requiredValues: number;
}

export interface EsQueryAlertParams extends AlertTypeParams {
  index: string[];
  timeField?: string;
  esQuery: string;
  thresholdComparator?: string;
  threshold: number[];
  timeWindowSize: number;
  timeWindowUnit: string;
}
