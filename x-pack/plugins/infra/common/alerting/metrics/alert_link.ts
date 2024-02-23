/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_PARAMETERS, TIMESTAMP } from '@kbn/rule-data-utils';
import { encode } from '@kbn/rison';
import { stringify } from 'query-string';
import { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common/parse_technical_fields';
import { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import {
  fifteenMinutesInMilliseconds,
  HOST_FIELD,
  LINK_TO_INVENTORY,
  METRICS_EXPLORER_URL,
} from '../../constants';

export const flatAlertRuleParams = (params: {}, pKey = ''): Record<string, unknown[]> => {
  return Object.entries(params).reduce((acc, [key, field]) => {
    const objectKey = pKey.length ? `${pKey}.${key}` : key;
    if (typeof field === 'object' && field != null) {
      if (Array.isArray(field) && field.length > 0) {
        return Object.assign(acc, flatAlertRuleParams(field[0] as {}, objectKey));
      } else {
        return Object.assign(acc, flatAlertRuleParams(field as {}, objectKey));
      }
    }
    acc[objectKey] = Array.isArray(field) ? field : [field];
    return acc;
  }, {} as Record<string, unknown[]>);
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
  const nodeType = inventoryFields[nodeTypeField] as InventoryItemType;
  const hostName = inventoryFields[HOST_FIELD];

  if (nodeType) {
    if (hostName) {
      return getLinkToHostDetails({ hostName, timestamp: inventoryFields[TIMESTAMP] });
    } else {
      const linkToParams = {
        nodeType: inventoryFields[nodeTypeField][0],
        timestamp: Date.parse(inventoryFields[TIMESTAMP]),
        customMetric: '',
        metric: '',
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
      return `${LINK_TO_INVENTORY}?${stringify(linkToParams)}`;
    }
  }

  return LINK_TO_INVENTORY;
};

export const getMetricsViewInAppUrl = (fields: ParsedTechnicalFields & Record<string, any>) => {
  const hostName = fields[HOST_FIELD];
  const timestamp = fields[TIMESTAMP];

  return hostName ? getLinkToHostDetails({ hostName, timestamp }) : METRICS_EXPLORER_URL;
};

export function getLinkToHostDetails({
  hostName,
  timestamp,
}: {
  hostName: string;
  timestamp: string;
}): string {
  const queryParams = {
    from: Date.parse(timestamp),
    to: Date.parse(timestamp) + fifteenMinutesInMilliseconds,
  };

  const encodedParams = encode(stringify(queryParams));

  return `/app/metrics/link-to/host-detail/${hostName}?${encodedParams}`;
}
