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

/* DO NOT MODIFY THIS SCHEMA TO ADD NEW FIELDS. These types represent the alerts that shipped in 8.12.0.
Any changes to these types should be bug fixes so the types more accurately represent the alerts from 8.12.0.
If you are adding new fields for a new release of Kibana, create a new sibling folder to this one
for the version to be released and add the field(s) to the schema in that folder.
Then, update `../index.ts` to import from the new folder that has the latest schemas, add the
new schemas to the union of all alert schemas, and re-export the new schemas as the `*Latest` schemas.
*/

export type { Ancestor890 as Ancestor8120 };

export interface BaseFields8120 extends BaseFields890 {
  [ALERT_WORKFLOW_ASSIGNEE_IDS]: string[] | undefined;
}

export interface WrappedFields8120<T extends BaseFields8120> {
  _id: string;
  _index: string;
  _source: T;
}

export type GenericAlert8120 = AlertWithCommonFields800<BaseFields8120>;

export type EqlShellFields8120 = EqlShellFields890 & BaseFields8120;

export type EqlBuildingBlockFields8120 = EqlBuildingBlockFields890 & BaseFields8120;

export type NewTermsFields8120 = NewTermsFields890 & BaseFields8120;

export type NewTermsAlert8120 = NewTermsFields890 & BaseFields8120;

export type EqlBuildingBlockAlert8120 = AlertWithCommonFields800<EqlBuildingBlockFields890>;

export type EqlShellAlert8120 = AlertWithCommonFields800<EqlShellFields8120>;

export type DetectionAlert8120 =
  | GenericAlert8120
  | EqlShellAlert8120
  | EqlBuildingBlockAlert8120
  | NewTermsAlert8120;
