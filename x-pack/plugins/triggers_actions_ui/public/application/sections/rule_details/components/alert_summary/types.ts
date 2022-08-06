/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Rule } from '../../../../../types';

export interface RuleAlertsSummaryProps {
  rule: Rule;
  filteredRuleTypes: string[];
}
export interface AlertChartData {
  status: 'active' | 'recovered' | 'total';
  count: number;
  date: number;
}

export interface AlertsChartProps {
  data: AlertChartData[];
}
