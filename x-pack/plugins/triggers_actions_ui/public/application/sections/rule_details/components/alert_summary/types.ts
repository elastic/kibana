/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { AlertStatus } from '@kbn/rule-data-utils';
import { AlertSummaryTimeRange } from '../../../../hooks/use_load_alert_summary';
import { Rule } from '../../../../../types';

export interface RuleAlertsSummaryProps {
  rule: Rule;
  filteredRuleTypes: string[];
  onClick: (status?: AlertStatus) => void;
  timeRange: AlertSummaryTimeRange;
  filter?: estypes.QueryDslQueryContainer;
}
