/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionConnector, ActionTypeIndex, RuleAction } from '../../../types';

export const getValidConnectors = (
  connectors: ActionConnector[],
  actionItem: RuleAction,
  actionTypesIndex: ActionTypeIndex,
  allowGroupConnector: string[] = []
): ActionConnector[] => {
  const actionType = actionTypesIndex[actionItem.actionTypeId];

  return connectors.filter((connector) => {
    const disabledInRegistry =
      actionType?.enabledInConfig && actionType?.enabledInLicense && !actionType?.enabled;
    return (
      (allowGroupConnector.includes(connector.actionTypeId) ||
        connector.actionTypeId === actionItem.actionTypeId) &&
      // include only enabled by config and registry connectors or preconfigured
      ((actionType?.enabledInConfig && !disabledInRegistry) || connector.isPreconfigured)
    );
  });
};
