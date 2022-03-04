/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Actions, ActionTypes } from '../../../../common/api';
import { UserActionBuilder } from '../abstract_builder';
import { UserActionParameters, BuilderReturnValue } from '../types';

export class PushedUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'pushed'>): BuilderReturnValue {
    return this.buildCommonUserAction({
      ...args,
      action: Actions.push_to_service,
      valueKey: 'externalService',
      value: this.extractConnectorIdFromExternalService(args.payload.externalService),
      type: ActionTypes.pushed,
      connectorId: args.payload.externalService.connector_id,
    });
  }
}
