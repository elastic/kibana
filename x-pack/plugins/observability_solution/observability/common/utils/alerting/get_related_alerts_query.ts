/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import type { Group } from '../../typings';

export interface Query {
  query: string;
  language: string;
}
interface Props {
  tags?: string[];
  groups?: Group[];
  ruleId?: string;
}

export const getRelatedAlertKuery = ({ tags, groups, ruleId }: Props = {}): string | undefined => {
  const tagKueries: string[] =
    tags?.map((tag) => {
      return `tags: "${tag}"`;
    }) ?? [];
  const groupKueries =
    (groups &&
      groups.map(({ field, value }) => {
        return `(${field}: "${value}" or kibana.alert.group.value: "${value}")`;
      })) ??
    [];
  const ruleKueries = (ruleId && [`(${ALERT_RULE_UUID}: "${ruleId}")`]) ?? [];

  const tagKueriesStr = tagKueries.length > 0 ? [`(${tagKueries.join(' or ')})`] : [];
  const groupKueriesStr = groupKueries.length > 0 ? [`${groupKueries.join(' or ')}`] : [];
  const kueries = [...tagKueriesStr, ...groupKueriesStr, ...ruleKueries];

  return kueries.length ? kueries.join(' or ') : undefined;
};
