/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionType } from '../common';
import { InMemoryConnector } from './types';

export const createSystemConnectors = (actionTypes: ActionType[]): InMemoryConnector[] => {
  const systemActionTypes = actionTypes.filter((actionType) => actionType.isSystemActionType);

  const systemConnectors: InMemoryConnector[] = systemActionTypes.map((systemActionType) => ({
    id: `system-connector-${systemActionType.id}`,
    actionTypeId: systemActionType.id,
    name: systemActionType.name,
    isMissingSecrets: false,
    config: {},
    secrets: {},
    isDeprecated: false,
    isPreconfigured: false,
    isSystemAction: true,
  }));

  return systemConnectors;
};
