/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { ConnectorTypeFieldsRt } from '../../connectors';
import { Fields, Actions } from './common';

export const ConnectorUserActionPayloadRt = rt.type({
  // TODO: Make it work with name, id
  connector: ConnectorTypeFieldsRt,
});

export const ConnectorUserActionRt = rt.type({
  fields: rt.array(rt.literal(Fields.connector)),
  action: rt.literal(Actions.update),
  payload: ConnectorUserActionPayloadRt,
});

export type ConnectorUserAction = rt.TypeOf<typeof ConnectorUserActionRt>;
