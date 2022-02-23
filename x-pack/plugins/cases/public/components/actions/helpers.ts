/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { get } from 'lodash/fp';
import { Ecs } from '../../containers/types';

// TODO investigate if we really need these types
type Maybe<T> = T | null;
export interface TimelineItem {
  _id: string;
  _index?: Maybe<string>;
  data: TimelineNonEcsData[];
  ecs: Ecs;
}
interface TimelineNonEcsData {
  field: string;
  value?: Maybe<string[]>;
}

export function normalizedEventFields(event?: TimelineItem) {
  const ruleUuidData = event && event.data.find(({ field }) => field === ALERT_RULE_UUID);
  const ruleNameData = event && event.data.find(({ field }) => field === ALERT_RULE_NAME);
  const ruleUuidValueData = ruleUuidData && ruleUuidData.value && ruleUuidData.value[0];
  const ruleNameValueData = ruleNameData && ruleNameData.value && ruleNameData.value[0];

  const ruleUuid =
    ruleUuidValueData ??
    get(`ecs.${ALERT_RULE_UUID}[0]`, event) ??
    get(`ecs.signal.rule.id[0]`, event) ??
    null;
  const ruleName =
    ruleNameValueData ??
    get(`ecs.${ALERT_RULE_NAME}[0]`, event) ??
    get(`ecs.signal.rule.name[0]`, event) ??
    null;

  return {
    ruleId: ruleUuid,
    ruleName,
  };
}
