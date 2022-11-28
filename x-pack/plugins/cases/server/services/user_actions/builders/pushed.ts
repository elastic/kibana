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

export class PushedUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'pushed'>): PersistableUserAction {
    const fields = this.buildCommonUserAction({
      ...args,
      action: Actions.push_to_service,
      valueKey: 'externalService',
      value: this.extractConnectorIdFromExternalService(args.payload.externalService),
      type: ActionTypes.pushed,
      connectorId: args.payload.externalService.connector_id,
    });

    const createMessage = (id?: string) =>
      `User pushed case id: ${args.caseId} to an external service with connector id: ${args.payload.externalService.connector_id} - user action id: ${id}`;

    const loggerFields: UserActionLogBody = {
      createMessage,
      eventAction: 'case_user_action_pushed_case',
      entityId: args.caseId,
      entityType: CASE_SAVED_OBJECT,
    };

    return this.createPersistableUserAction(loggerFields, fields);
  }
}
