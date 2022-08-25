/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ALERT_UUID } from '@kbn/rule-data-utils';
import type { AlertWithCommonFields800 } from '@kbn/rule-registry-plugin/common/schemas/8.0.0';
import type { BaseFields840 } from '../8.4.0';
import type { Ancestor800, EqlBuildingBlockAlert800, EqlShellAlert800 } from '../8.0.0';

export type { Ancestor800 as Ancestor840 };

/* DO NOT MODIFY THIS SCHEMA TO ADD NEW FIELDS. These types represent the alerts that shipped in 8.4.0.
Any changes to these types should be bug fixes so the types more accurately represent the alerts from 8.4.0.

If you are adding new fields for a new release of Kibana, create a new sibling folder to this one
for the version to be released and add the field(s) to the schema in that folder.
Then, update `../index.ts` to import from the new folder that has the latest schemas, add the
new schemas to the union of all alert schemas, and re-export the new schemas as the `*Latest` schemas.
*/
export type BaseFields850 = BaseFields840;

export interface WrappedFields850<T extends BaseFields850> {
  _id: string;
  _index: string;
  _source: T & { [ALERT_UUID]: string };
}

export type GenericAlert850 = AlertWithCommonFields800<BaseFields850>;

export type EqlBuildingBlockFields850 = BaseFields850;

export type NewTermsFields850 = BaseFields850;

export type NewTermsAlert850 = AlertWithCommonFields800<NewTermsFields850>;

// This is the type of the final generated alert including base fields, common fields
// added by the alertWithPersistence function, and arbitrary fields copied from source documents
export type DetectionAlert850 =
  | GenericAlert850
  | EqlShellAlert800
  | EqlBuildingBlockAlert800
  | NewTermsAlert850;
