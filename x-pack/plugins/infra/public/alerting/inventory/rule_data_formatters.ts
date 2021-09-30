/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_REASON, ALERT_RULE_PARAMS, TIMESTAMP } from '@kbn/rule-data-utils';
import { encode } from 'rison-node';
import { ObservabilityRuleTypeFormatter } from '../../../../observability/public';

const LINK_PARAMS_TEMPLATE =
  '?waffleFilter=(expression:%27%27,kind:kuery)&waffleTime=(currentTime:{timestamp},isAutoReloading:!f)&waffleOptions=(accountId:%27%27,autoBounds:!t,boundsOverride:(max:1,min:0),customMetrics:!({customMetric}),customOptions:!(),groupBy:!(),legend:(palette:cool,reverseColors:!f,steps:10),metric:{metric},nodeType:{nodeType},region:%27%27,sort:(by:name,direction:desc),timelineOpen:!f,view:map)';

export const formatReason: ObservabilityRuleTypeFormatter = ({ fields }) => {
  const reason = fields[ALERT_REASON] ?? '-';
  const ruleParams =
    typeof fields[ALERT_RULE_PARAMS] === 'string' ? JSON.parse(fields[ALERT_RULE_PARAMS]!) : {};

  const urlParams: Record<string, any> = {
    nodeType: ruleParams.nodeType,
    timestamp: Date.parse(fields[TIMESTAMP]),
    customMetric: '',
  };

  // We always pick the first criteria for the URL
  const criteria = ruleParams.criteria[0];
  if (criteria.customMetric.id !== 'alert-custom-metric') {
    const customMetric = encode(criteria.customMetric);
    urlParams.customMetric = customMetric;
    urlParams.metric = customMetric;
  } else {
    urlParams.metric = encode({ type: criteria.metric });
  }

  const link =
    '/app/metrics/inventory' + LINK_PARAMS_TEMPLATE.replace(/{(\w+)}/g, (_, key) => urlParams[key]);

  return {
    reason,
    link,
  };
};
