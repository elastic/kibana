/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CaseUserActions } from '../../containers/types';

export const getConnectorFieldsFromUserActions = (id: string, userActions: CaseUserActions[]) => {
  try {
    for (const action of [...userActions].reverse()) {
      if (action.actionField.length === 1 && action.actionField[0] === 'connector') {
        if (action.oldValue && action.newValue) {
          const oldValue = JSON.parse(action.oldValue);
          const newValue = JSON.parse(action.newValue);

          if (newValue.id === id) {
            return newValue.fields;
          }

          if (oldValue.id === id) {
            return oldValue.fields;
          }
        }
      }
    }

    return null;
  } catch {
    return null;
  }
};
