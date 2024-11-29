/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ALERT_SEVERITY, ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import type { GroupBySelection } from '../alerts_progress_bar_panel/types';

const DEFAULT_QUERY_SIZE = 1000;

export const severityAggregations = {
  statusBySeverity: {
    terms: {
      field: ALERT_SEVERITY,
    },
  },
};

export const alertRuleAggregations = {
  alertsByRule: {
    terms: {
      field: ALERT_RULE_NAME,
      size: DEFAULT_QUERY_SIZE,
    },
  },
};

export const alertsGroupingAggregations = (stackByField: GroupBySelection) => {
  return {
    alertsByGrouping: {
      terms: {
        field: stackByField,
        size: 10,
      },
    },
    missingFields: {
      missing: { field: stackByField },
    },
  };
};
