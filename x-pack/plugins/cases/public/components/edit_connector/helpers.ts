/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorTypeFields } from '../../../common';
import { CaseUserActions } from '../../containers/types';

export const getConnectorFieldsFromUserActions = (
  id: string,
  userActions: CaseUserActions[]
): ConnectorTypeFields['fields'] => {
  for (const action of [...userActions].reverse()) {
    if (action.payload.connector) {
      const connector = action.payload.connector;

      if (connector && id === connector.id) {
        return connector.fields;
      }
    }
  }

  return null;
};
