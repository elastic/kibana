/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { ENABLED_AUTOMATED_RESPONSE_ACTION_COMMANDS } from '../../../../endpoint/service/response_actions/constants';

// to enable using RESPONSE_ACTION_API_COMMANDS_NAMES as a type
function keyObject<T extends readonly string[]>(arr: T): { [K in T[number]]: null } {
  return Object.fromEntries(arr.map((v) => [v, null])) as never;
}

const EndpointParamsConfig = t.type({
  field: t.union([t.string, t.undefined]),
  parent: t.union([t.boolean, t.undefined]),
});

export type EndpointParamsConfig = t.TypeOf<typeof EndpointParamsConfig>;

export const EndpointParams = t.type({
  command: t.keyof(keyObject(ENABLED_AUTOMATED_RESPONSE_ACTION_COMMANDS)),
  comment: t.union([t.string, t.undefined]),
  config: t.union([EndpointParamsConfig, t.undefined]),
});

export type EndpointParams = t.TypeOf<typeof EndpointParams>;
