/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_REASON, ALERT_RULE_PARAMETERS, TIMESTAMP } from '@kbn/rule-data-utils';
import { encode } from 'rison-node';
import { stringify } from 'query-string';
import { ObservabilityRuleTypeFormatter } from '../../../../observability/public';

export const formatReason: ObservabilityRuleTypeFormatter = ({ fields }) => {
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
    const criteriaMetric = fields[`${ALERT_RULE_PARAMETERS}.criteria.metric`][0];
    const criteriaCustomMetricId = fields[`${ALERT_RULE_PARAMETERS}.criteria.customMetric.id`][0];
    if (criteriaCustomMetricId !== 'alert-custom-metric') {
      const criteriaCustomMetricAggregation =
        fields[`${ALERT_RULE_PARAMETERS}.criteria.customMetric.aggregation`][0];
      const criteriaCustomMetricField =
        fields[`${ALERT_RULE_PARAMETERS}.criteria.customMetric.field`][0];

      const customMetric = encode({
        id: criteriaCustomMetricId,
        type: 'custom',
        field: criteriaCustomMetricField,
        aggregation: criteriaCustomMetricAggregation,
      });
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
