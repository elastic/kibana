/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import { CaseAssigneesSchema } from '../assignee';
import type { UserActionWithAttributes } from './common';
import { ActionTypes } from './common';

export const AssigneesUserActionPayloadSchema = z.strictObject({ assignees: CaseAssigneesSchema });

export const AssigneesUserActionSchema = z.strictObject({
  type: z.literal(ActionTypes.assignees),
  payload: AssigneesUserActionPayloadSchema,
});

export type AssigneesUserAction = UserActionWithAttributes<
  z.infer<typeof AssigneesUserActionSchema>
>;
