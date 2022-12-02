/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import { CaseConnectorSchema, CaseUserActionConnectorSchema } from '../../connectors';
import type { UserActionWithAttributes } from './common';
import { ActionTypes } from './common';

export const ConnectorUserActionPayloadWithoutConnectorIdSchema = z.strictObject({
  connector: CaseUserActionConnectorSchema,
});

export const ConnectorUserActionPayloadSchema = z.strictObject({
  connector: CaseConnectorSchema,
});

export const ConnectorUserActionWithoutConnectorIdSchema = z.strictObject({
  type: z.literal(ActionTypes.connector),
  payload: ConnectorUserActionPayloadWithoutConnectorIdSchema,
});

export const ConnectorUserActionSchema = z.strictObject({
  type: z.literal(ActionTypes.connector),
  payload: ConnectorUserActionPayloadSchema,
});

export type ConnectorUserAction = UserActionWithAttributes<
  z.infer<typeof ConnectorUserActionSchema>
>;
export type ConnectorUserActionWithoutConnectorId = UserActionWithAttributes<
  z.infer<typeof ConnectorUserActionWithoutConnectorIdSchema>
>;
