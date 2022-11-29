/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_SAVED_OBJECT } from '../../../../common/constants';
import { Actions, ActionTypes, CaseStatuses } from '../../../../common/api';
import { UserActionBuilder } from '../abstract_builder';
import type { PersistableUserAction } from '../persistable_user_action';
import type { UserActionLogBody, UserActionParameters } from '../types';

export class CreateCaseUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'create_case'>): PersistableUserAction {
    const { payload, caseId, owner, user } = args;
    const connectorWithoutId = this.extractConnectorId(payload.connector);
    const fields = {
      attributes: {
        ...this.getCommonUserActionAttributes({ user, owner }),
        action: Actions.create,
        payload: { ...payload, connector: connectorWithoutId, status: CaseStatuses.open },
        type: ActionTypes.create_case,
      },
      references: [
        ...this.createCaseReferences(caseId),
        ...this.createConnectorReference(payload.connector.id),
      ],
    };

    const createMessage = (id?: string) =>
      `User created case id: ${caseId} - user action id: ${id}`;

    const loggerFields: UserActionLogBody = {
      createMessage,
      eventAction: 'case_user_action_create_case',
      savedObjectId: caseId,
      savedObjectType: CASE_SAVED_OBJECT,
    };

    return this.createPersistableUserAction(loggerFields, fields);
  }
}
