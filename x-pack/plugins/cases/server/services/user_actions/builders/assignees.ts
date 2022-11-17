/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionTypes, Actions } from '../../../../common/api';
import { UserActionBuilder } from '../abstract_builder';
import type { ConstructedUserAction } from '../constructed_user_action';
import type { UserActionLogBody, UserActionParameters } from '../types';

export class AssigneesUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'assignees'>): ConstructedUserAction {
    const persistableFields = this.buildCommonUserAction({
      ...args,
      action: args.action ?? Actions.add,
      valueKey: 'assignees',
      value: args.payload.assignees,
      type: ActionTypes.assignees,
    });

    const loggerFields: UserActionLogBody = {
      auditLogger: this.auditLogger,
    };
  }
}
