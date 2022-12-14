/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertStatus } from '@kbn/rule-data-utils';
import { AlertSummaryTimeRange } from '../../../../hooks/use_load_rule_alerts_aggregations';
import { Rule } from '../../../../../types';

export interface RuleAlertsSummaryProps {
  rule: Rule;
  filteredRuleTypes: string[];
  onClick: (status?: AlertStatus) => void;
  timeRange: AlertSummaryTimeRange;
}
