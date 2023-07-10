/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { CommentRequestRt, CommentRequestWithoutRefsRt } from '../comment';
import type { UserActionWithAttributes } from './common';
import { ActionTypes } from './common';

export const CommentUserActionPayloadRt = rt.strict({ comment: CommentRequestRt });
export const CommentUserActionPayloadWithoutIdsRt = rt.strict({
  comment: CommentRequestWithoutRefsRt,
});

export const CommentUserActionRt = rt.strict({
  type: rt.literal(ActionTypes.comment),
  payload: CommentUserActionPayloadRt,
});

export const CommentUserActionWithoutIdsRt = rt.strict({
  type: rt.literal(ActionTypes.comment),
  payload: CommentUserActionPayloadWithoutIdsRt,
});

export type CommentUserAction = UserActionWithAttributes<rt.TypeOf<typeof CommentUserActionRt>>;
export type CommentUserActionPayloadWithoutIds = UserActionWithAttributes<
  rt.TypeOf<typeof CommentUserActionPayloadWithoutIdsRt>
>;
