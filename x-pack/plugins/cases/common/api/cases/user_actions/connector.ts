/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { CaseUserActionConnectorRt, CaseConnectorRt } from '../../connectors/connector';
import type { UserActionWithAttributes } from './common';
import { ActionTypes } from './common';

export const ConnectorUserActionPayloadWithoutConnectorIdRt = rt.strict({
  connector: CaseUserActionConnectorRt,
});

export const ConnectorUserActionPayloadRt = rt.strict({
  connector: CaseConnectorRt,
});

export const ConnectorUserActionWithoutConnectorIdRt = rt.strict({
  type: rt.literal(ActionTypes.connector),
  payload: ConnectorUserActionPayloadWithoutConnectorIdRt,
});

export const ConnectorUserActionRt = rt.strict({
  type: rt.literal(ActionTypes.connector),
  payload: ConnectorUserActionPayloadRt,
});

export type ConnectorUserAction = UserActionWithAttributes<rt.TypeOf<typeof ConnectorUserActionRt>>;
export type ConnectorUserActionWithoutConnectorId = UserActionWithAttributes<
  rt.TypeOf<typeof ConnectorUserActionWithoutConnectorIdRt>
>;
