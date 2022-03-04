/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { CaseUserActionConnectorRt, CaseConnectorRt } from '../../connectors';
import { ActionTypes, UserActionWithAttributes } from './common';

export const ConnectorUserActionPayloadWithoutConnectorIdRt = rt.type({
  connector: CaseUserActionConnectorRt,
});

export const ConnectorUserActionPayloadRt = rt.type({
  connector: CaseConnectorRt,
});

export const ConnectorUserActionWithoutConnectorIdRt = rt.type({
  type: rt.literal(ActionTypes.connector),
  payload: ConnectorUserActionPayloadWithoutConnectorIdRt,
});

export const ConnectorUserActionRt = rt.type({
  type: rt.literal(ActionTypes.connector),
  payload: ConnectorUserActionPayloadRt,
});

export type ConnectorUserAction = UserActionWithAttributes<rt.TypeOf<typeof ConnectorUserActionRt>>;
export type ConnectorUserActionWithoutConnectorId = UserActionWithAttributes<
  rt.TypeOf<typeof ConnectorUserActionWithoutConnectorIdRt>
>;
