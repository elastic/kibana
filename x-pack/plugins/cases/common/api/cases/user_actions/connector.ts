/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { CaseUserActionConnectorRt, CaseConnectorRt } from '../../connectors';
import { Fields, Actions } from './common';

export const ConnectorUserActionPayloadWithoutConnectorIdRt = rt.type({
  connector: CaseUserActionConnectorRt,
});

export const ConnectorUserActionPayloadRt = rt.type({
  connector: CaseConnectorRt,
});

export const ConnectorUserActionWithoutConnectorIdRt = rt.type({
  fields: rt.array(rt.literal(Fields.connector)),
  action: rt.literal(Actions.update),
  payload: ConnectorUserActionPayloadWithoutConnectorIdRt,
});

export const ConnectorUserActionRt = rt.type({
  fields: rt.array(rt.literal(Fields.connector)),
  action: rt.literal(Actions.update),
  payload: ConnectorUserActionPayloadRt,
});

export type ConnectorUserAction = rt.TypeOf<typeof ConnectorUserActionRt>;
export type ConnectorUserActionWithoutConnectorId = rt.TypeOf<
  typeof ConnectorUserActionWithoutConnectorIdRt
>;
