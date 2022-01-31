/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Values } from '@kbn/utility-types';
import {
  ALERT_INSTANCE_ID,
  ALERT_UUID,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  SPACE_IDS,
  ALERT_RULE_TAGS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';

const commonAlertFieldNames = [
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  SPACE_IDS,
  ALERT_RULE_TAGS,
  TIMESTAMP,
];
export type CommonAlertFieldName = Values<typeof commonAlertFieldNames>;

const commonAlertIdFieldNames = [ALERT_INSTANCE_ID, ALERT_UUID];
export type CommonAlertIdFieldName = Values<typeof commonAlertIdFieldNames>;

export interface CommonAlertFields {
  [ALERT_RULE_CATEGORY]: string;
  [ALERT_RULE_CONSUMER]: string;
  [ALERT_RULE_EXECUTION_UUID]: string;
  [ALERT_RULE_NAME]: string;
  [ALERT_RULE_PRODUCER]: string;
  [ALERT_RULE_TYPE_ID]: string;
  [ALERT_RULE_UUID]: string;
  [SPACE_IDS]: string[];
  [ALERT_RULE_TAGS]: string[];
  [TIMESTAMP]: string;
}

export type AlertWithCommonFields<T> = T & CommonAlertFields;
