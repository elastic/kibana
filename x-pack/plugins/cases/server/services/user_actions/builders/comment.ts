/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionTypes, Actions } from '../../../../common/api';
import { UserActionBuilder } from '../abstract_builder';
import { BuilderArgs, BuilderReturnValue } from '../types';

export class CommentUserActionBuilder extends UserActionBuilder {
  build(args: BuilderArgs): BuilderReturnValue {
    return this.buildCommonUserAction({
      ...args,
      action: args.action ?? Actions.update,
      valueKey: 'comment',
      value: args.payload.comment,
      type: ActionTypes.comment,
      extraReferences:
        args.attachmentId != null ? this.createCommentReferences(args.attachmentId) : [],
    });
  }
}
