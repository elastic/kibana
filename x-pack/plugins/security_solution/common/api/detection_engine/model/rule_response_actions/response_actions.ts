/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { EndpointParams } from './endpoint';
import { OsqueryParams, OsqueryParamsCamelCase } from './osquery';

export enum RESPONSE_ACTION_TYPES {
  OSQUERY = '.osquery',
  ENDPOINT = '.endpoint',
}

export const SUPPORTED_RESPONSE_ACTION_TYPES = Object.values(RESPONSE_ACTION_TYPES);

// When we create new response action types, create a union of types
export const OsqueryResponseActionRuleParam = t.strict({
  actionTypeId: t.literal(RESPONSE_ACTION_TYPES.OSQUERY),
  params: OsqueryParamsCamelCase,
});

export type RuleResponseOsqueryAction = t.TypeOf<typeof OsqueryResponseActionRuleParam>;

export const EndpointResponseActionRuleParam = t.strict({
  actionTypeId: t.literal(RESPONSE_ACTION_TYPES.ENDPOINT),
  params: EndpointParams,
});

export type RuleResponseEndpointAction = t.TypeOf<typeof EndpointResponseActionRuleParam>;

const ResponseActionRuleParam = t.union([
  OsqueryResponseActionRuleParam,
  EndpointResponseActionRuleParam,
]);
export type RuleResponseAction = t.TypeOf<typeof ResponseActionRuleParam>;

export const ResponseActionRuleParamsOrUndefined = t.union([
  t.array(ResponseActionRuleParam),
  t.undefined,
]);

// When we create new response action types, create a union of types
const OsqueryResponseAction = t.strict({
  action_type_id: t.literal(RESPONSE_ACTION_TYPES.OSQUERY),
  params: OsqueryParams,
});

const EndpointResponseAction = t.strict({
  action_type_id: t.literal(RESPONSE_ACTION_TYPES.ENDPOINT),
  params: EndpointParams,
});

const ResponseAction = t.union([OsqueryResponseAction, EndpointResponseAction]);

export const ResponseActionArray = t.array(ResponseAction);

export type ResponseAction = t.TypeOf<typeof ResponseAction>;
