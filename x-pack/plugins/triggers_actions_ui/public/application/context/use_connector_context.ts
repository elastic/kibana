/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { ConnectorContext } from './connector_context';

export const useConnectorContext = () => {
  const connectorContext = useContext(ConnectorContext);

  if (!connectorContext) {
    throw new Error(
      'useConnectorContext must be used within a ConnectorProvider and have a defined value.'
    );
  }

  return connectorContext;
};
