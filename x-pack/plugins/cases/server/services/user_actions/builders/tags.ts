/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_SAVED_OBJECT } from '../../../../common/constants';
import { ActionTypes, Actions } from '../../../../common/api';
import { UserActionBuilder } from '../abstract_builder';
import type { PersistableUserAction } from '../persistable_user_action';
import type { UserActionLogBody, UserActionParameters } from '../types';

export class TagsUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'tags'>): PersistableUserAction {
    const action = args.action ?? Actions.add;

    const fields = this.buildCommonUserAction({
      ...args,
      action: args.action ?? Actions.add,
      valueKey: 'tags',
      value: args.payload.tags,
      type: ActionTypes.tags,
    });

    const createMessage = (id: string) =>
      `Case id: ${args.caseId} tags ${action} - user action id: ${id}`;

    const loggerFields: UserActionLogBody = {
      createMessage,
      eventAction: `case_user_action_${action}_case_tags`,
      entityId: args.caseId,
      entityType: CASE_SAVED_OBJECT,
    };

    return this.createPersistableUserAction(loggerFields, fields);
  }
}
