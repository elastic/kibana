/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Actions, ActionTypes } from '../../../../common/api';
import { UserActionBuilder } from '../abstract_builder';
import { UserActionParameters, BuilderReturnValue } from '../types';

export class DeleteCaseUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'delete_case'>): BuilderReturnValue {
    const { caseId, owner, user, connectorId } = args;
    return {
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
  }
}
