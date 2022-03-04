/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { ActionTypes, UserActionWithAttributes } from './common';

export const DeleteCaseUserActionRt = rt.type({
  type: rt.literal(ActionTypes.delete_case),
  payload: rt.type({}),
});

export type DeleteCaseUserAction = UserActionWithAttributes<
  rt.TypeOf<typeof DeleteCaseUserActionRt>
>;
