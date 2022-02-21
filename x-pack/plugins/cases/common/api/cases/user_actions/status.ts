/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { CaseStatusRt } from '../status';
import { ActionTypes, UserActionWithAttributes } from './common';

export const StatusUserActionPayloadRt = rt.type({ status: CaseStatusRt });

export const StatusUserActionRt = rt.type({
  type: rt.literal(ActionTypes.status),
  payload: StatusUserActionPayloadRt,
});

export type StatusUserAction = UserActionWithAttributes<rt.TypeOf<typeof StatusUserActionRt>>;
