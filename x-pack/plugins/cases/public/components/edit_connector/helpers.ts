/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorTypeFields } from '../../../common';
import { CaseUserActions } from '../../containers/types';
import { parseStringAsConnector } from '../../common/user_actions';

export const getConnectorFieldsFromUserActions = (
  id: string,
  userActions: CaseUserActions[]
): ConnectorTypeFields['fields'] => {
  try {
    for (const action of [...userActions].reverse()) {
      if (action.actionField.length === 1 && action.actionField[0] === 'connector') {
        const parsedNewConnector = parseStringAsConnector(
          action.newValConnectorId,
          action.newValue
        );

        if (parsedNewConnector && id === parsedNewConnector.id) {
          return parsedNewConnector.fields;
        }

        const parsedOldConnector = parseStringAsConnector(
          action.oldValConnectorId,
          action.oldValue
        );

        if (parsedOldConnector && id === parsedOldConnector.id) {
          return parsedOldConnector.fields;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
};
