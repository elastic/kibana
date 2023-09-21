/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ALERT_WORKFLOW_ASSIGNEE_IDS } from '@kbn/rule-data-utils';
import type { AlertWithCommonFields800 } from '@kbn/rule-registry-plugin/common/schemas/8.0.0';
import type {
  Ancestor890,
  BaseFields890,
  EqlBuildingBlockFields890,
  EqlShellFields890,
  NewTermsFields890,
} from '../8.9.0';

/* DO NOT MODIFY THIS SCHEMA TO ADD NEW FIELDS. These types represent the alerts that shipped in 8.11.0.
Any changes to these types should be bug fixes so the types more accurately represent the alerts from 8.11.0.
If you are adding new fields for a new release of Kibana, create a new sibling folder to this one
for the version to be released and add the field(s) to the schema in that folder.
Then, update `../index.ts` to import from the new folder that has the latest schemas, add the
new schemas to the union of all alert schemas, and re-export the new schemas as the `*Latest` schemas.
*/

export type { Ancestor890 as Ancestor8110 };

export interface BaseFields8110 extends BaseFields890 {
  [ALERT_WORKFLOW_ASSIGNEE_IDS]: string[];
}

export interface WrappedFields8110<T extends BaseFields8110> {
  _id: string;
  _index: string;
  _source: T;
}

export type GenericAlert8110 = AlertWithCommonFields800<BaseFields8110>;

export type EqlShellFields8110 = EqlShellFields890 & BaseFields8110;

export type EqlBuildingBlockFields8110 = EqlBuildingBlockFields890 & BaseFields8110;

export type NewTermsFields8110 = NewTermsFields890 & BaseFields8110;

export type NewTermsAlert8110 = NewTermsFields890 & BaseFields8110;

export type EqlBuildingBlockAlert8110 = AlertWithCommonFields800<EqlBuildingBlockFields890>;

export type EqlShellAlert8110 = AlertWithCommonFields800<EqlShellFields8110>;

export type DetectionAlert8110 =
  | GenericAlert8110
  | EqlShellAlert8110
  | EqlBuildingBlockAlert8110
  | NewTermsAlert8110;
