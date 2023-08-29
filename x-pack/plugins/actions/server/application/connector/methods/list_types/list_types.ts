/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsClientContext } from '../../../../actions_client';
import { ConnectorType } from '../../types';
import { ListTypesParams } from './types';

export async function listTypes(
  context: ActionsClientContext,
  options: ListTypesParams
): Promise<ConnectorType[]> {
  // assert the input
  const featureId = (options as ListTypesParams).featureId;
  const includeSystemActionTypes = (options as ListTypesParams).includeSystemActionTypes;

  const connectorTypes = context.actionTypeRegistry.list(featureId);

  const filteredConnectorTypes = includeSystemActionTypes
    ? connectorTypes
    : connectorTypes.filter((type) => !Boolean(type.isSystemActionType));

  return filteredConnectorTypes;
}
