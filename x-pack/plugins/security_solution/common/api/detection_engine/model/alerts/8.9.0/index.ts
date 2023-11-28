/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ALERT_WORKFLOW_TAGS } from '@kbn/rule-data-utils';
import type { AlertWithCommonFields800 } from '@kbn/rule-registry-plugin/common/schemas/8.0.0';
import type {
  Ancestor880,
  BaseFields880,
  EqlBuildingBlockFields880,
  EqlShellFields880,
  NewTermsFields880,
} from '../8.8.0';

/* DO NOT MODIFY THIS SCHEMA TO ADD NEW FIELDS. These types represent the alerts that shipped in 8.9.0.
Any changes to these types should be bug fixes so the types more accurately represent the alerts from 8.9.0.
If you are adding new fields for a new release of Kibana, create a new sibling folder to this one
for the version to be released and add the field(s) to the schema in that folder.
Then, update `../index.ts` to import from the new folder that has the latest schemas, add the
new schemas to the union of all alert schemas, and re-export the new schemas as the `*Latest` schemas.
*/

export type { Ancestor880 as Ancestor890 };

export interface BaseFields890 extends BaseFields880 {
  [ALERT_WORKFLOW_TAGS]: string[];
}

export interface WrappedFields890<T extends BaseFields890> {
  _id: string;
  _index: string;
  _source: T;
}

export type GenericAlert890 = AlertWithCommonFields800<BaseFields890>;

export type EqlShellFields890 = EqlShellFields880 & BaseFields890;

export type EqlBuildingBlockFields890 = EqlBuildingBlockFields880 & BaseFields890;

export type NewTermsFields890 = NewTermsFields880 & BaseFields890;

export type NewTermsAlert890 = NewTermsFields880 & BaseFields890;

export type EqlBuildingBlockAlert890 = AlertWithCommonFields800<EqlBuildingBlockFields880>;

export type EqlShellAlert890 = AlertWithCommonFields800<EqlShellFields890>;

export type DetectionAlert890 =
  | GenericAlert890
  | EqlShellAlert890
  | EqlBuildingBlockAlert890
  | NewTermsAlert890;
