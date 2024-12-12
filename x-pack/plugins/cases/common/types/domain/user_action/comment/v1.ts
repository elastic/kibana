/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { AttachmentRequestRt, AttachmentRequestWithoutRefsRt } from '../../../api/attachment/v1';
import { UserActionTypes } from '../action/v1';

export const CommentUserActionPayloadRt = rt.strict({
  comment: AttachmentRequestRt,
  latest: rt.union([
    rt.strict({
      comment: rt.string,
      updated_at: rt.union([rt.string, rt.null]),
    }),
    rt.undefined,
  ]),
});

export const CommentUserActionPayloadWithoutIdsRt = rt.strict({
  comment: AttachmentRequestWithoutRefsRt,
  // TODO: check if latest should be defined here too
});

export const CommentUserActionRt = rt.strict({
  type: rt.literal(UserActionTypes.comment),
  payload: CommentUserActionPayloadRt,
});

export const CommentUserActionWithoutIdsRt = rt.strict({
  type: rt.literal(UserActionTypes.comment),
  payload: CommentUserActionPayloadWithoutIdsRt,
});
