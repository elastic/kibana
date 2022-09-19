/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NonEmptyString } from '@kbn/securitysolution-io-ts-types';
import * as t from 'io-ts';

export enum RESPONSE_ACTION_TYPES {
  OSQUERY = '.osquery',
}
export const SUPPORTED_RESPONSE_ACTION_TYPES = Object.values(RESPONSE_ACTION_TYPES);

const ResponseActionRuleParam = t.exact(
  t.type({
    actionTypeId: NonEmptyString,
    params: t.record(t.string, t.any),
  })
);
export type RuleResponseAction = t.TypeOf<typeof ResponseActionRuleParam>;

export const ResponseActionRuleParamsOrUndefined = t.union([
  t.array(ResponseActionRuleParam),
  t.undefined,
]);

const ResponseAction = t.exact(
  t.type({
    action_type_id: NonEmptyString,
    params: t.record(t.string, t.any),
  })
);

export const ResponseActionArray = t.array(ResponseAction);

export type ResponseAction = t.TypeOf<typeof ResponseAction>;
