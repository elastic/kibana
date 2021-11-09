/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_REASON,
  ALERT_RULE_PARAMS,
  TIMESTAMP,
} from '@kbn/rule-data-utils/technical_field_names';
import { encode } from 'rison-node';
import { stringify } from 'query-string';
import { ObservabilityRuleTypeFormatter } from '../../../../observability/public';
import { InventoryMetricThresholdParams } from '../../../common/alerting/metrics';

export const formatReason: ObservabilityRuleTypeFormatter = ({ fields }) => {
  const reason = fields[ALERT_REASON] ?? '-';
  const ruleParams = parseRuleParams(fields[ALERT_RULE_PARAMS]);

  let link = '/app/metrics/link-to/inventory?';

  if (ruleParams) {
    const linkToParams: Record<string, any> = {
      nodeType: ruleParams.nodeType,
      timestamp: Date.parse(fields[TIMESTAMP]),
      customMetric: '',
    };

    // We always pick the first criteria metric for the URL
    const criteria = ruleParams.criteria[0];
    if (criteria.customMetric && criteria.customMetric.id !== 'alert-custom-metric') {
      const customMetric = encode(criteria.customMetric);
      linkToParams.customMetric = customMetric;
      linkToParams.metric = customMetric;
    } else {
      linkToParams.metric = encode({ type: criteria.metric });
    }

    link += stringify(linkToParams);
  }

  return {
    reason,
    link,
  };
};

function parseRuleParams(params?: string): InventoryMetricThresholdParams | undefined {
  try {
    return typeof params === 'string' ? JSON.parse(params) : undefined;
  } catch (_) {
    return;
  }
}
