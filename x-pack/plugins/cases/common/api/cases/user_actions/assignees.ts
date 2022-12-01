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

export const AssigneesUserActionPayloadSchema = z
  .object({ assignees: CaseAssigneesSchema })
  .strict();

export const AssigneesUserActionSchema = z
  .object({
    type: z.literal(ActionTypes.assignees),
    payload: AssigneesUserActionPayloadSchema,
  })
  .strict();

export type AssigneesUserAction = UserActionWithAttributes<
  z.infer<typeof AssigneesUserActionSchema>
>;
