/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_SAVED_OBJECT } from '../../../../common/constants';
import type { UserAction } from '../../../../common/api';
import { Actions, ActionTypes } from '../../../../common/api';
import { UserActionBuilder } from '../abstract_builder';
import type {
  SavedObjectParameters,
  EventDetails,
  UserActionParameters,
  UserActionEvent,
} from '../types';

export class DeleteCaseUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'delete_case'>): UserActionEvent {
    const { caseId, owner, user, connectorId } = args;
    const action = Actions.delete;

    const parameters: SavedObjectParameters = {
      attributes: {
        ...this.getCommonUserActionAttributes({ user, owner }),
        action,
        payload: {},
        type: ActionTypes.delete_case,
      },
      references: [
        ...this.createCaseReferences(caseId),
        ...this.createConnectorReference(connectorId ?? null),
      ],
    };

    return {
      parameters,
      eventDetails: createDeleteEvent({ caseId, action }),
    };
  }
}

export const createDeleteEvent = ({
  caseId,
  action,
}: {
  caseId: string;
  action: UserAction;
}): EventDetails => ({
  getMessage: () => `User deleted case id: ${caseId}`,
  action,
  descriptiveAction: 'case_user_action_delete_case',
  savedObjectId: caseId,
  savedObjectType: CASE_SAVED_OBJECT,
});
