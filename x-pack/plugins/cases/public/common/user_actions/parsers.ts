/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CaseUserActionConnectorRt,
  CaseConnector,
  ConnectorTypes,
  noneConnectorId,
  CaseFullExternalService,
  CaseUserActionExternalServiceRt,
} from '../../../common';

export const parseStringAsConnector = (
  id: string | null,
  encodedData: string | null
): CaseConnector | null => {
  if (encodedData == null) {
    return null;
  }

  const decodedConnector = parseString(encodedData);

  if (!CaseUserActionConnectorRt.is(decodedConnector)) {
    return null;
  }

  if (id == null && decodedConnector.type === ConnectorTypes.none) {
    return {
      ...decodedConnector,
      id: noneConnectorId,
    };
  } else if (id == null) {
    return null;
  } else {
    // id does not equal null or undefined and the connector type does not equal none
    // so return the connector with its id
    return {
      ...decodedConnector,
      id,
    };
  }
};

const parseString = (params: string | null): unknown | null => {
  if (params == null) {
    return null;
  }

  try {
    return JSON.parse(params);
  } catch {
    return null;
  }
};

export const parseStringAsExternalService = (
  id: string | null,
  encodedData: string | null
): CaseFullExternalService => {
  if (encodedData == null) {
    return null;
  }

  const decodedExternalService = parseString(encodedData);
  if (!CaseUserActionExternalServiceRt.is(decodedExternalService)) {
    return null;
  }

  return {
    ...decodedExternalService,
    connector_id: id,
  };
};
