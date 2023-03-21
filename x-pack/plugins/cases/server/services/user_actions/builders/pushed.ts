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

export class PushedUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'pushed'>): UserActionEvent {
    const action = Actions.push_to_service;

    const parameters = this.buildCommonUserAction({
      ...args,
      action,
      valueKey: 'externalService',
      value: this.extractConnectorIdFromExternalService(args.payload.externalService),
      type: ActionTypes.pushed,
      connectorId: args.payload.externalService.connector_id,
    });

    const getMessage = (id?: string) =>
      `User pushed case id: ${args.caseId} to an external service with connector id: ${args.payload.externalService.connector_id} - user action id: ${id}`;

    const eventDetails: EventDetails = {
      getMessage,
      action,
      descriptiveAction: 'case_user_action_pushed_case',
      savedObjectId: args.caseId,
      savedObjectType: CASE_SAVED_OBJECT,
    };

    return {
      parameters,
      eventDetails,
    };
  }
}
