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
import type {
  PersistableUserActionFields,
  UserActionLogBody,
  UserActionParameters,
} from '../types';

export class DeleteCaseUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'delete_case'>): PersistableUserAction {
    const { caseId, owner, user, connectorId } = args;

    const persistableFields: PersistableUserActionFields = {
      attributes: {
        ...this.getCommonUserActionAttributes({ user, owner }),
        action: Actions.delete,
        payload: {},
        type: ActionTypes.delete_case,
      },
      references: [
        ...this.createCaseReferences(caseId),
        ...this.createConnectorReference(connectorId ?? null),
      ],
    };

    const createMessage = () => `User deleted case id: ${caseId}`;

    const loggerFields: UserActionLogBody = {
      createMessage,
      eventAction: 'case_user_action_delete_case',
      entityId: caseId,
      entityType: CASE_SAVED_OBJECT,
    };

    return this.createPersistableUserAction(loggerFields, persistableFields);
  }
}
