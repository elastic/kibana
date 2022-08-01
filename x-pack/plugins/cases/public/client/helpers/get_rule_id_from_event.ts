/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { get } from 'lodash/fp';
import { isArray } from 'lodash';
import { Ecs } from '../../../common';

type Maybe<T> = T | null;
interface Event {
  data: EventNonEcsData[];
  ecs: Ecs;
}

type FieldValue = Maybe<string[] | number[] | object[] | string | number>;

interface EventNonEcsData {
  field: string;
  value?: FieldValue;
}

const getValueFromField = (field: EventNonEcsData | undefined) => {
  if (!field || !field.value) return null;
  if (isArray(field.value)) {
    return field.value[0];
  }
  return field.value;
};

export function getRuleIdFromEvent(event: Event): {
  id: string;
  name: string;
} {
  const ruleUuidData = event && event.data.find(({ field }) => field === ALERT_RULE_UUID);
  const ruleNameData = event && event.data.find(({ field }) => field === ALERT_RULE_NAME);
  const ruleUuidValueData = getValueFromField(ruleUuidData);
  const ruleNameValueData = getValueFromField(ruleNameData);

  const getRuleUUID = get(`ecs.${ALERT_RULE_UUID}[0]`);
  const getSignalRuleName = get(`ecs.signal.rule.name[0]`);

  const ruleUuid = ruleUuidValueData ?? getRuleUUID(event) ?? getSignalRuleName(event) ?? null;
  const ruleName = ruleNameValueData ?? getRuleUUID(event) ?? getSignalRuleName(event) ?? null;

  return {
    id: ruleUuid,
    name: ruleName,
  };
}
