/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { CaseAssigneesRt } from '../assignee';
import type { UserActionWithAttributes } from './common';
import { ActionTypes } from './common';

export const AssigneesUserActionPayloadRt = rt.type({ assignees: CaseAssigneesRt });

export const AssigneesUserActionRt = rt.type({
  type: rt.literal(ActionTypes.assignees),
  payload: AssigneesUserActionPayloadRt,
});

export type AssigneesUserAction = UserActionWithAttributes<rt.TypeOf<typeof AssigneesUserActionRt>>;
