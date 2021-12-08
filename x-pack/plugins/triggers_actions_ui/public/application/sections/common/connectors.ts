/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionConnector, ActionTypeIndex, AlertAction } from '../../../types';

export const getValidConnectors = (
  connectors: ActionConnector[],
  actionItem: AlertAction,
  actionTypesIndex: ActionTypeIndex
): ActionConnector[] => {
  const actionType = actionTypesIndex[actionItem.actionTypeId];

  return connectors.filter(
    (connector) =>
      connector.actionTypeId === actionItem.actionTypeId &&
      // include only enabled by config connectors or preconfigured
      (actionType?.enabledInConfig || connector.isPreconfigured)
  );
};
