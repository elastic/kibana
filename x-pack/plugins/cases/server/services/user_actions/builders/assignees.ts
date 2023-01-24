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
import type { EventDetails, UserActionParameters, UserActionEvent } from '../types';

export class AssigneesUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'assignees'>): UserActionEvent {
    const action = args.action ?? Actions.add;

    const soParams = this.buildCommonUserAction({
      ...args,
      action,
      valueKey: 'assignees',
      value: args.payload.assignees,
      type: ActionTypes.assignees,
    });

    const uids = args.payload.assignees.map((assignee) => assignee.uid);
    const verbMessage = getVerbMessage(action, uids);

    const getMessage = (id?: string) =>
      `User ${verbMessage} case id: ${args.caseId} - user action id: ${id}`;

    const event: EventDetails = {
      getMessage,
      action,
      descriptiveAction: `case_user_action_${action}_case_assignees`,
      savedObjectId: args.caseId,
      savedObjectType: CASE_SAVED_OBJECT,
    };

    return {
      parameters: soParams,
      eventDetails: event,
    };
  }
}

const getVerbMessage = (action: UserAction, uids: string[]) => {
  const uidText = `uids: [${uids}]`;

  switch (action) {
    case 'add':
      return `assigned ${uidText} to`;
    case 'delete':
      return `unassigned ${uidText} from`;
    default:
      return `changed ${uidText} for`;
  }
};
