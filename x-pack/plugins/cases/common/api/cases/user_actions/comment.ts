/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { CommentRequestRt } from '../comment';
import { Fields, Actions } from './common';

export const CommentUserActionPayloadRt = rt.type({ comment: CommentRequestRt });

export const CommentUserActionRt = rt.type({
  fields: rt.array(rt.literal(Fields.comment)),
  action: rt.union([rt.literal(Actions.update), rt.literal(Actions.create)]),
  payload: CommentUserActionPayloadRt,
});

export type CommentUserAction = rt.TypeOf<typeof CommentUserActionRt>;
