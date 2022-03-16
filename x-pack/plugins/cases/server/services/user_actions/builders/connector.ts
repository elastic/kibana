/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Actions, ActionTypes } from '../../../../common/api';
import { UserActionBuilder } from '../abstract_builder';
import { UserActionParameters, BuilderReturnValue } from '../types';

export class ConnectorUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'connector'>): BuilderReturnValue {
    return this.buildCommonUserAction({
      ...args,
      action: Actions.update,
      valueKey: 'connector',
      value: this.extractConnectorId(args.payload.connector),
      type: ActionTypes.connector,
      connectorId: args.payload.connector.id,
    });
  }
}
