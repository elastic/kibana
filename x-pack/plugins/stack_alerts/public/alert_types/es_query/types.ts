/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleTypeParams } from '../../../../alerting/common';

export interface Comparator {
  text: string;
  value: string;
  requiredValues: number;
}

export interface EsQueryAlertParams extends RuleTypeParams {
  index: string[];
  timeField?: string;
  esQuery: string;
  size: number;
  thresholdComparator?: string;
  threshold: number[];
  timeWindowSize: number;
  timeWindowUnit: string;
}
