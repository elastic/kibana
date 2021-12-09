/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_REASON,
  ALERT_RULE_PARAMETERS,
  TIMESTAMP,
} from '@kbn/rule-data-utils/technical_field_names';
import { encode } from 'rison-node';
import { stringify } from 'query-string';
import { ObservabilityRuleTypeFormatter } from '../../../../observability/public';

export const formatReason: ObservabilityRuleTypeFormatter = ({ fields }) => {
  console.log(fields, '!!fieldss');
  const reason = fields[ALERT_REASON] ?? '-';
  const nodeTypeField = `${ALERT_RULE_PARAMETERS}.nodeType`;
  const nodeType = fields[nodeTypeField];
  let link = '/app/metrics/link-to/inventory?';

  if (nodeType) {
    const linkToParams: Record<string, any> = {
      nodeType: fields[nodeTypeField][0],
      timestamp: Date.parse(fields[TIMESTAMP]),
      customMetric: '',
    };

    // We always pick the first criteria metric for the URL
    const criteriaMetricField = `${ALERT_RULE_PARAMETERS}.criteria.metric`;
    const criteriaMetric = fields[criteriaMetricField][0];
    const criteriaCustomMetricIdField = `${ALERT_RULE_PARAMETERS}.criteria.id`;
    const criteriaCustomMetricId = fields[criteriaCustomMetricIdField][0];
    if (criteriaCustomMetricId === 'alert-custom-metric') {
      const customMetric = encode({ id: criteriaCustomMetricId });
      linkToParams.customMetric = customMetric;
      linkToParams.metric = customMetric;
    } else {
      linkToParams.metric = encode({ type: criteriaMetric });
    }

    link += stringify(linkToParams);
  }

  return {
    reason,
    link,
  };
};
