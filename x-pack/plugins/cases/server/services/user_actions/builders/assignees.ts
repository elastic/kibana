/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_SAVED_OBJECT } from '../../../../common/constants';
import type { UserAction } from '../../../../common/api';
import { ActionTypes, Actions } from '../../../../common/api';
import { UserActionBuilder } from '../abstract_builder';
import type { PersistableUserAction } from '../persistable_user_action';
import type { UserActionLogBody, UserActionParameters } from '../types';

export class AssigneesUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'assignees'>): PersistableUserAction {
    const action = args.action ?? Actions.add;

    const persistableFields = this.buildCommonUserAction({
      ...args,
      action,
      valueKey: 'assignees',
      value: args.payload.assignees,
      type: ActionTypes.assignees,
    });

    const uids = args.payload.assignees.map((assignee) => assignee.uid);
    const verb = getAuditLogActionVerb(action);

    const createMessage = (id: string) =>
      `Case id: ${args.caseId} ${verb} uids: [${uids}] - user action id: ${id}`;

    const loggerFields: UserActionLogBody = {
      createMessage,
      eventAction: `case_user_action_${action}_case_assignees`,
      entityId: args.caseId,
      entityType: CASE_SAVED_OBJECT,
    };

    return this.createPersistableUserAction(loggerFields, persistableFields);
  }
}

const getAuditLogActionVerb = (action: UserAction) => {
  switch (action) {
    case 'add':
      return 'assigned';
    case 'delete':
      return 'unassigned';
    default:
      return 'changed';
  }
};
