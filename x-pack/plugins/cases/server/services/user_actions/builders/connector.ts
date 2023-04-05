/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_SAVED_OBJECT } from '../../../../common/constants';
import { Actions, ActionTypes } from '../../../../common/api';
import { UserActionBuilder } from '../abstract_builder';
import type { EventDetails, UserActionParameters, UserActionEvent } from '../types';

export class ConnectorUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'connector'>): UserActionEvent {
    const action = Actions.update;

    const parameters = this.buildCommonUserAction({
      ...args,
      action,
      valueKey: 'connector',
      value: this.extractConnectorId(args.payload.connector),
      type: ActionTypes.connector,
      connectorId: args.payload.connector.id,
    });

    const getMessage = (id?: string) =>
      `User changed the case connector to id: ${args.payload.connector.id} for case id: ${args.caseId} - user action id: ${id}`;

    const eventDetails: EventDetails = {
      getMessage,
      action,
      descriptiveAction: 'case_user_action_update_case_connector',
      savedObjectId: args.caseId,
      savedObjectType: CASE_SAVED_OBJECT,
    };

    return {
      parameters,
      eventDetails,
    };
  }
}
