/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_BUILDING_BLOCK_TYPE,
  ALERT_REASON,
  ALERT_RISK_SCORE,
  ALERT_RULE_AUTHOR,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_CREATED_AT,
  ALERT_RULE_CREATED_BY,
  ALERT_RULE_DESCRIPTION,
  ALERT_RULE_ENABLED,
  ALERT_RULE_FROM,
  ALERT_RULE_INTERVAL,
  ALERT_RULE_LICENSE,
  ALERT_RULE_NAME,
  ALERT_RULE_NAMESPACE_FIELD,
  ALERT_RULE_NOTE,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_REFERENCES,
  ALERT_RULE_RULE_ID,
  ALERT_RULE_RULE_NAME_OVERRIDE,
  ALERT_RULE_TAGS,
  ALERT_RULE_TO,
  ALERT_RULE_TYPE,
  ALERT_RULE_UPDATED_AT,
  ALERT_RULE_UPDATED_BY,
  ALERT_RULE_UUID,
  ALERT_RULE_VERSION,
  ALERT_SEVERITY,
  ALERT_STATUS,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  EVENT_KIND,
  SPACE_IDS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
// TODO: Create and import 8.0.0 versioned ListArray schema
import { ListArray } from '@kbn/securitysolution-io-ts-list-types';
// TODO: Create and import 8.0.0 versioned alerting-types schemas
import {
  RiskScoreMapping,
  SeverityMapping,
  Threats,
  Type,
} from '@kbn/securitysolution-io-ts-alerting-types';
import {
  ALERT_ANCESTORS,
  ALERT_DEPTH,
  ALERT_ORIGINAL_TIME,
  ALERT_RULE_ACTIONS,
  ALERT_RULE_EXCEPTIONS_LIST,
  ALERT_RULE_FALSE_POSITIVES,
  ALERT_GROUP_ID,
  ALERT_GROUP_INDEX,
  ALERT_RULE_IMMUTABLE,
  ALERT_RULE_MAX_SIGNALS,
  ALERT_RULE_RISK_SCORE_MAPPING,
  ALERT_RULE_SEVERITY_MAPPING,
  ALERT_RULE_THREAT,
  ALERT_RULE_THROTTLE,
  ALERT_RULE_TIMELINE_ID,
  ALERT_RULE_TIMELINE_TITLE,
  ALERT_RULE_TIMESTAMP_OVERRIDE,
} from '../../../../field_maps/field_names';
// TODO: Create and import 8.0.0 versioned RuleAlertAction type
import { RuleAlertAction, SearchTypes } from '../../../types';
import { AlertWithCommonFields800 } from '../../../../../../rule_registry/common/schemas/8.0.0';

/* DO NOT MODIFY THIS SCHEMA TO ADD NEW FIELDS. These types represent the alerts that shipped in 8.0.0.
Any changes to these types should be bug fixes so the types more accurately represent the alerts from 8.0.0.

If you are adding new fields for a new release of Kibana, create a new sibling folder to this one
for the version to be released and add the field(s) to the schema in that folder.

Then, update `../index.ts` to import from the new folder that has the latest schemas, add the
new schemas to the union of all alert schemas, and re-export the new schemas as the `*Latest` schemas.
*/

export interface Ancestor800 {
  rule: string | undefined;
  id: string;
  type: string;
  index: string;
  depth: number;
}

export interface BaseFields800 {
  [TIMESTAMP]: string;
  [SPACE_IDS]: string[];
  [EVENT_KIND]: 'signal';
  [ALERT_ORIGINAL_TIME]: string | undefined;
  // When we address https://github.com/elastic/kibana/issues/102395 and change ID generation logic, consider moving
  // ALERT_UUID creation into buildAlert and keep ALERT_UUID with the rest of BaseFields fields. As of 8.2 though,
  // ID generation logic is fragmented and it would be more confusing to put any of it in buildAlert
  // [ALERT_UUID]: string;
  [ALERT_RULE_CONSUMER]: string;
  [ALERT_ANCESTORS]: Ancestor800[];
  [ALERT_STATUS]: string;
  [ALERT_WORKFLOW_STATUS]: string;
  [ALERT_DEPTH]: number;
  [ALERT_REASON]: string;
  [ALERT_BUILDING_BLOCK_TYPE]: string | undefined;
  [ALERT_SEVERITY]: string;
  [ALERT_RISK_SCORE]: number;
  // TODO: version rule schemas and pull in 8.0.0 versioned rule schema to define alert rule parameters type
  [ALERT_RULE_PARAMETERS]: { [key: string]: SearchTypes };
  [ALERT_RULE_ACTIONS]: RuleAlertAction[];
  [ALERT_RULE_AUTHOR]: string[];
  [ALERT_RULE_CREATED_AT]: string;
  [ALERT_RULE_CREATED_BY]: string;
  [ALERT_RULE_DESCRIPTION]: string;
  [ALERT_RULE_ENABLED]: boolean;
  [ALERT_RULE_EXCEPTIONS_LIST]: ListArray;
  [ALERT_RULE_FALSE_POSITIVES]: string[];
  [ALERT_RULE_FROM]: string;
  [ALERT_RULE_IMMUTABLE]: boolean;
  [ALERT_RULE_INTERVAL]: string;
  [ALERT_RULE_LICENSE]: string | undefined;
  [ALERT_RULE_MAX_SIGNALS]: number;
  [ALERT_RULE_NAME]: string;
  [ALERT_RULE_NAMESPACE_FIELD]: string | undefined;
  [ALERT_RULE_NOTE]: string | undefined;
  [ALERT_RULE_REFERENCES]: string[];
  [ALERT_RULE_RISK_SCORE_MAPPING]: RiskScoreMapping;
  [ALERT_RULE_RULE_ID]: string;
  [ALERT_RULE_RULE_NAME_OVERRIDE]: string | undefined;
  [ALERT_RULE_SEVERITY_MAPPING]: SeverityMapping;
  [ALERT_RULE_TAGS]: string[];
  [ALERT_RULE_THREAT]: Threats;
  [ALERT_RULE_THROTTLE]: string | undefined;
  [ALERT_RULE_TIMELINE_ID]: string | undefined;
  [ALERT_RULE_TIMELINE_TITLE]: string | undefined;
  [ALERT_RULE_TIMESTAMP_OVERRIDE]: string | undefined;
  [ALERT_RULE_TO]: string;
  [ALERT_RULE_TYPE]: Type;
  [ALERT_RULE_UPDATED_AT]: string;
  [ALERT_RULE_UPDATED_BY]: string;
  [ALERT_RULE_UUID]: string;
  [ALERT_RULE_VERSION]: number;
  'kibana.alert.rule.risk_score': number;
  'kibana.alert.rule.severity': string;
  'kibana.alert.rule.building_block_type': string | undefined;
  [key: string]: SearchTypes;
}

// This type is used after the alert UUID is generated and stored in the _id and ALERT_UUID fields
export interface WrappedFields800<T extends BaseFields800> {
  _id: string;
  _index: string;
  _source: T & { [ALERT_UUID]: string };
}

export interface EqlBuildingBlockFields800 extends BaseFields800 {
  [ALERT_GROUP_ID]: string;
  [ALERT_GROUP_INDEX]: number;
  [ALERT_BUILDING_BLOCK_TYPE]: 'default';
}

export interface EqlShellFields800 extends BaseFields800 {
  [ALERT_GROUP_ID]: string;
  [ALERT_UUID]: string;
}

export type EqlBuildingBlockAlert800 = AlertWithCommonFields800<EqlBuildingBlockFields800>;

export type EqlShellAlert800 = AlertWithCommonFields800<EqlShellFields800>;

export type GenericAlert800 = AlertWithCommonFields800<BaseFields800>;

// This is the type of the final generated alert including base fields, common fields
// added by the alertWithPersistence function, and arbitrary fields copied from source documents
export type DetectionAlert800 = GenericAlert800 | EqlShellAlert800 | EqlBuildingBlockAlert800;
