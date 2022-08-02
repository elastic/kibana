/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_PARAMETERS, TIMESTAMP } from '@kbn/rule-data-utils';
import { encode } from 'rison-node';
import { stringify } from 'query-string';
import { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common/parse_technical_fields';

export const flatAlertRuleParams = (params: {}, pKey = ''): Record<string, unknown[]> => {
  return Object.entries(params).reduce((acc, [key, field]) => {
    const objectKey = pKey.length ? `${pKey}.${key}` : key;
    if (typeof field === 'object' && field != null) {
      if (Array.isArray(field) && field.length > 0) {
        return {
          ...acc,
          ...flatAlertRuleParams(field[0] as {}, objectKey),
        };
      } else {
        return {
          ...acc,
          ...flatAlertRuleParams(field as {}, objectKey),
        };
      }
    }
    return {
      ...acc,
      [objectKey]: Array.isArray(field) ? field : [field],
    };
  }, {});
};

export const getInventoryViewInAppUrl = (
  fields: ParsedTechnicalFields & Record<string, any>
): string => {
  let inventoryFields = fields;

  /* Temporary Solution -> https://github.com/elastic/kibana/issues/137033
   * In the alert table from timelines plugin (old table), we are using an API who is flattening all the response
   * from elasticsearch to Record<string, string[]>, The new alert table API from TriggersActionUI is not doing that
   * anymore, it is trusting and returning the way it has been done from the field API from elasticsearch. I think
   * it is better to trust elasticsearch and the mapping of the doc. When o11y will only use the new alert table from
   * triggersActionUI then we will stop using this flattening way and we will update the code to work with fields API,
   * it will be less magic.
   */
  if (fields[ALERT_RULE_PARAMETERS]) {
    inventoryFields = {
      ...fields,
      ...flatAlertRuleParams(fields[ALERT_RULE_PARAMETERS] as {}, ALERT_RULE_PARAMETERS),
    };
  }

  const nodeTypeField = `${ALERT_RULE_PARAMETERS}.nodeType`;
  const nodeType = inventoryFields[nodeTypeField];
  let inventoryViewInAppUrl = '/app/metrics/link-to/inventory?';

  if (nodeType) {
    const linkToParams: Record<string, any> = {
      nodeType: inventoryFields[nodeTypeField][0],
      timestamp: Date.parse(inventoryFields[TIMESTAMP]),
      customMetric: '',
    };
    // We always pick the first criteria metric for the URL
    const criteriaMetric = inventoryFields[`${ALERT_RULE_PARAMETERS}.criteria.metric`][0];
    if (criteriaMetric === 'custom') {
      const criteriaCustomMetricId =
        inventoryFields[`${ALERT_RULE_PARAMETERS}.criteria.customMetric.id`][0];
      const criteriaCustomMetricAggregation =
        inventoryFields[`${ALERT_RULE_PARAMETERS}.criteria.customMetric.aggregation`][0];
      const criteriaCustomMetricField =
        inventoryFields[`${ALERT_RULE_PARAMETERS}.criteria.customMetric.field`][0];

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
    inventoryViewInAppUrl += stringify(linkToParams);
  }
  return inventoryViewInAppUrl;
};
