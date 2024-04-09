/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsClient } from '@kbn/actions-plugin/server';
import { ConnectorAdapterRegistry } from '../connector_adapters/connector_adapter_registry';

interface Args {
  actionsClient: ActionsClient;
  connectorAdapterRegistry: ConnectorAdapterRegistry;
  consumer: string;
  systemActions?: Array<{ id: string }>;
}

export const getSystemActionKibanaPrivileges = async ({
  actionsClient,
  connectorAdapterRegistry,
  systemActions = [],
  consumer,
}: Args): Promise<string[]> => {
  const allSystemConnectors = await actionsClient.getAllSystemConnectors();

  const kibanaPrivileges = allSystemConnectors
    .filter((action) => systemActions.find((systemConnector) => action.id === systemConnector.id))
    .filter((action) => connectorAdapterRegistry.has(action.actionTypeId))
    .map((action) => connectorAdapterRegistry.get(action.actionTypeId))
    .map((adapter) => adapter.getKibanaPrivileges?.({ consumer }) ?? [])
    .flat();

  return kibanaPrivileges;
};
