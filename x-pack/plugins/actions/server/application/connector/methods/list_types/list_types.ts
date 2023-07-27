/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionType } from '../../../../../common';
import { ActionsClientContext } from '../../../../actions_client/types';

export interface ListTypesParams {
  featureId?: string;
  includeSystemActionTypes?: boolean;
}

export async function listTypes(
  context: ActionsClientContext,
  listTypesParams: ListTypesParams
): Promise<ActionType[]> {
  const { featureId, includeSystemActionTypes } = listTypesParams;
  const connectorTypes = context.actionTypeRegistry.list(featureId);

  const filteredConnectorTypes = includeSystemActionTypes
    ? connectorTypes
    : connectorTypes.filter((type) => !Boolean(type.isSystemActionType));

  return filteredConnectorTypes;
}
