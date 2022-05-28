/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { CaseUserActionExternalServiceRt, CaseExternalServiceBasicRt } from '../case';
import { ActionTypes, UserActionWithAttributes } from './common';

export const PushedUserActionPayloadWithoutConnectorIdRt = rt.type({
  externalService: CaseUserActionExternalServiceRt,
});

export const PushedUserActionPayloadRt = rt.type({
  externalService: CaseExternalServiceBasicRt,
});

export const PushedUserActionWithoutConnectorIdRt = rt.type({
  type: rt.literal(ActionTypes.pushed),
  payload: PushedUserActionPayloadWithoutConnectorIdRt,
});

export const PushedUserActionRt = rt.type({
  type: rt.literal(ActionTypes.pushed),
  payload: PushedUserActionPayloadRt,
});

export type PushedUserAction = UserActionWithAttributes<rt.TypeOf<typeof PushedUserActionRt>>;
export type PushedUserActionWithoutConnectorId = UserActionWithAttributes<
  rt.TypeOf<typeof PushedUserActionWithoutConnectorIdRt>
>;
