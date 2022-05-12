/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { CommentRequestRt } from '../comment';
import { ActionTypes, UserActionWithAttributes } from './common';

export const CommentUserActionPayloadRt = rt.type({ comment: CommentRequestRt });

export const CommentUserActionRt = rt.type({
  type: rt.literal(ActionTypes.comment),
  payload: CommentUserActionPayloadRt,
});

export type CommentUserAction = UserActionWithAttributes<rt.TypeOf<typeof CommentUserActionRt>>;
