/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ALERT_BUILDING_BLOCK_TYPE, ALERT_UUID } from '@kbn/rule-data-utils';
import type { AlertWithCommonFields800 } from '@kbn/rule-registry-plugin/common/schemas/8.0.0';
import type {
  ALERT_GROUP_ID,
  ALERT_GROUP_INDEX,
  ALERT_NEW_TERMS,
  ALERT_RULE_INDICES,
} from '../../../../field_maps/field_names';
import type {
  Ancestor800,
  BaseFields800,
  EqlBuildingBlockAlert800,
  EqlShellAlert800,
} from '../8.0.0';

export type { Ancestor800 as Ancestor840 };

/* DO NOT MODIFY THIS SCHEMA TO ADD NEW FIELDS. These types represent the alerts that shipped in 8.4.0.
Any changes to these types should be bug fixes so the types more accurately represent the alerts from 8.4.0.
If you are adding new fields for a new release of Kibana, create a new sibling folder to this one
for the version to be released and add the field(s) to the schema in that folder.
Then, update `../index.ts` to import from the new folder that has the latest schemas, add the
new schemas to the union of all alert schemas, and re-export the new schemas as the `*Latest` schemas.
*/
export interface BaseFields840 extends BaseFields800 {
  [ALERT_RULE_INDICES]: string[];
}

export interface WrappedFields840<T extends BaseFields840> {
  _id: string;
  _index: string;
  _source: T & { [ALERT_UUID]: string };
}

export type GenericAlert840 = AlertWithCommonFields800<BaseFields840>;

export interface EqlShellFields840 extends BaseFields840 {
  [ALERT_GROUP_ID]: string;
  [ALERT_UUID]: string;
}

export interface EqlBuildingBlockFields840 extends BaseFields840 {
  [ALERT_GROUP_ID]: string;
  [ALERT_GROUP_INDEX]: number;
  [ALERT_BUILDING_BLOCK_TYPE]: 'default';
}

export interface NewTermsFields840 extends BaseFields840 {
  [ALERT_NEW_TERMS]: Array<string | number | null>;
}

export type NewTermsAlert840 = AlertWithCommonFields800<NewTermsFields840>;

// This is the type of the final generated alert including base fields, common fields
// added by the alertWithPersistence function, and arbitrary fields copied from source documents
export type DetectionAlert840 =
  | GenericAlert840
  | EqlShellAlert800
  | EqlBuildingBlockAlert800
  | NewTermsAlert840;
