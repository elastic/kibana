/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { CaseUserActionExternalServiceRt, CaseExternalServiceBasicRt } from '../case';
import { Fields, Actions } from './common';

export const PushedUserActionPayloadWithoutConnectorIdRt = rt.type({
  externalService: CaseUserActionExternalServiceRt,
});

export const PushedUserActionPayloadRt = rt.type({
  externalService: CaseExternalServiceBasicRt,
});

export const PushedUserActionWithoutConnectorIdRt = rt.type({
  fields: rt.array(rt.literal(Fields.pushed)),
  action: rt.literal(Actions.push_to_service),
  payload: PushedUserActionPayloadWithoutConnectorIdRt,
});

export const PushedUserActionRt = rt.type({
  fields: rt.array(rt.literal(Fields.pushed)),
  action: rt.literal(Actions.push_to_service),
  payload: PushedUserActionPayloadRt,
});

export type PushedUserAction = rt.TypeOf<typeof PushedUserActionRt>;
export type PushedUserActionWithoutConnectorId = rt.TypeOf<
  typeof PushedUserActionWithoutConnectorIdRt
>;
