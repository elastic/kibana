/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { CaseUserActionExternalServiceRt, CaseExternalServiceBasicRt } from '../case';
import type { UserActionWithAttributes } from './common';
import { ActionTypes } from './common';

export const PushedUserActionPayloadWithoutConnectorIdRt = rt.strict({
  externalService: CaseUserActionExternalServiceRt,
});

export const PushedUserActionPayloadRt = rt.strict({
  externalService: CaseExternalServiceBasicRt,
});

export const PushedUserActionWithoutConnectorIdRt = rt.strict({
  type: rt.literal(ActionTypes.pushed),
  payload: PushedUserActionPayloadWithoutConnectorIdRt,
});

export const PushedUserActionRt = rt.strict({
  type: rt.literal(ActionTypes.pushed),
  payload: PushedUserActionPayloadRt,
});

export type PushedUserAction = UserActionWithAttributes<rt.TypeOf<typeof PushedUserActionRt>>;
export type PushedUserActionWithoutConnectorId = UserActionWithAttributes<
  rt.TypeOf<typeof PushedUserActionWithoutConnectorIdRt>
>;
