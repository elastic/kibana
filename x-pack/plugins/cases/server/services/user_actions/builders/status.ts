/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_SAVED_OBJECT } from '../../../../common/constants';
import { Actions, ActionTypes } from '../../../../common/api';
import { UserActionBuilder } from '../abstract_builder';
import type { PersistableUserAction } from '../persistable_user_action';
import type { UserActionLogBody, UserActionParameters } from '../types';

export class StatusUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'status'>): PersistableUserAction {
    const fields = this.buildCommonUserAction({
      ...args,
      action: Actions.update,
      valueKey: 'status',
      value: args.payload.status,
      type: ActionTypes.status,
    });

    const createMessage = (id?: string) =>
      `User updated the status for case id: ${args.caseId} - user action id: ${id}`;

    const loggerFields: UserActionLogBody = {
      createMessage,
      eventAction: 'case_user_action_update_case_status',
      savedObjectId: args.caseId,
      savedObjectType: CASE_SAVED_OBJECT,
    };

    return this.createPersistableUserAction(loggerFields, fields);
  }
}
