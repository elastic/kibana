/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionTypes, Actions } from '../../../../common/api';
import { UserActionBuilder } from '../abstract_builder';
import { UserActionParameters, BuilderReturnValue } from '../types';

export class TagsUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'tags'>): BuilderReturnValue {
    return this.buildCommonUserAction({
      ...args,
      action: args.action ?? Actions.add,
      valueKey: 'tags',
      value: args.payload.tags,
      type: ActionTypes.tags,
    });
  }
}
