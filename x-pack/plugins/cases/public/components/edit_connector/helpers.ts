/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorTypes, noneConnectorId } from '../../../common';
import { CaseUserActions } from '../../containers/types';

export const getConnectorFieldsFromUserActions = (id: string, userActions: CaseUserActions[]) => {
  try {
    for (const action of [...userActions].reverse()) {
      if (action.actionField.length === 1 && action.actionField[0] === 'connector') {
        if (idMatchesActionValue(id, action.newValConnectorId, action.newValue)) {
          return JSON.parse(action.newValue).fields;
        }

        if (idMatchesActionValue(id, action.oldValConnectorId, action.oldValue)) {
          return JSON.parse(action.oldValue).fields;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
};

const idMatchesActionValue = (
  id: string,
  valueId: string | null,
  encodedValue: string | null
): encodedValue is string => {
  try {
    if (id === valueId && encodedValue != null) {
      return true;
    }

    if (id === noneConnectorId && valueId === null && encodedValue != null) {
      const decodedValue = JSON.parse(encodedValue);
      if (decodedValue.type === ConnectorTypes.none) {
        return true;
      }
    }
  } catch (error) {
    // just return false when an error occurs
  }

  return false;
};
