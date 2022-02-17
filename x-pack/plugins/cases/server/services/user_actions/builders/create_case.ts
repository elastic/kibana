/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Actions, ActionTypes, CaseStatuses } from '../../../../common/api';
import { UserActionBuilder } from '../abstract_builder';
import { UserActionParameters, BuilderReturnValue } from '../types';

export class CreateCaseUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'create_case'>): BuilderReturnValue {
    const { payload, caseId, owner, user } = args;
    const connectorWithoutId = this.extractConnectorId(payload.connector);
    return {
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
  }
}
