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

/* DO NOT MODIFY THIS SCHEMA TO ADD NEW FIELDS. These types represent the alerts that shipped in 8.0.0.
Any changes to these types should be bug fixes so the types more accurately represent the alerts from 8.0.0.

If you are adding new fields for a new release of Kibana, create a new sibling folder to this one
for the version to be released and add the field(s) to the schema in that folder.

Then, update `../index.ts` to import from the new folder that has the latest schemas, add the
new schemas to the union of all alert schemas, and re-export the new schemas as the `*Latest` schemas.
*/

const commonAlertIdFieldNames = [ALERT_INSTANCE_ID, ALERT_UUID];
export type CommonAlertIdFieldName800 = Values<typeof commonAlertIdFieldNames>;

export interface CommonAlertFields800 {
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

export type CommonAlertFieldName800 = keyof CommonAlertFields800;

export type AlertWithCommonFields800<T> = T & CommonAlertFields800;
