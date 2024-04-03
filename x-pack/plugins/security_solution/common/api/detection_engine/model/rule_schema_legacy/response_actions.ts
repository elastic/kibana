/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { arrayQueries, ecsMapping } from '@kbn/osquery-io-ts-types';
import * as t from 'io-ts';

// to enable using RESPONSE_ACTION_API_COMMANDS_NAMES as a type
function keyObject<T extends readonly string[]>(arr: T): { [K in T[number]]: null } {
  return Object.fromEntries(arr.map((v) => [v, null])) as never;
}

export type EndpointParams = t.TypeOf<typeof EndpointParams>;
export const EndpointParams = t.type({
  // TODO: TC- change these when we go GA with automated process actions
  command: t.keyof(keyObject(['isolate', 'kill-process', 'suspend-process'])),
  // command: t.keyof(keyObject(ENABLED_AUTOMATED_RESPONSE_ACTION_COMMANDS)),
  comment: t.union([t.string, t.undefined]),
});

export const OsqueryParams = t.type({
  query: t.union([t.string, t.undefined]),
  ecs_mapping: t.union([ecsMapping, t.undefined]),
  queries: t.union([arrayQueries, t.undefined]),
  pack_id: t.union([t.string, t.undefined]),
  saved_query_id: t.union([t.string, t.undefined]),
});

export const OsqueryParamsCamelCase = t.type({
  query: t.union([t.string, t.undefined]),
  ecsMapping: t.union([ecsMapping, t.undefined]),
  queries: t.union([arrayQueries, t.undefined]),
  packId: t.union([t.string, t.undefined]),
  savedQueryId: t.union([t.string, t.undefined]),
});

// When we create new response action types, create a union of types
export type RuleResponseOsqueryAction = t.TypeOf<typeof RuleResponseOsqueryAction>;
export const RuleResponseOsqueryAction = t.strict({
  actionTypeId: t.literal('.osquery'),
  params: OsqueryParamsCamelCase,
});

export type RuleResponseEndpointAction = t.TypeOf<typeof RuleResponseEndpointAction>;
export const RuleResponseEndpointAction = t.strict({
  actionTypeId: t.literal('.endpoint'),
  params: EndpointParams,
});

export type RuleResponseAction = t.TypeOf<typeof ResponseActionRuleParam>;
const ResponseActionRuleParam = t.union([RuleResponseOsqueryAction, RuleResponseEndpointAction]);

export const ResponseActionRuleParamsOrUndefined = t.union([
  t.array(ResponseActionRuleParam),
  t.undefined,
]);

// When we create new response action types, create a union of types
const OsqueryResponseAction = t.strict({
  action_type_id: t.literal('.osquery'),
  params: OsqueryParams,
});

const EndpointResponseAction = t.strict({
  action_type_id: t.literal('.endpoint'),
  params: EndpointParams,
});

export type ResponseAction = t.TypeOf<typeof ResponseAction>;
export const ResponseAction = t.union([OsqueryResponseAction, EndpointResponseAction]);

export const ResponseActionArray = t.array(ResponseAction);
