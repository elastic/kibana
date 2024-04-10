/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleSystemAction } from '../types';
import { ConnectorAdapterRegistry } from './connector_adapter_registry';

interface Args {
  connectorAdapterRegistry: ConnectorAdapterRegistry;
  rule: { consumer: string };
  systemActions?: RuleSystemAction[];
}

export const getSystemActionKibanaPrivileges = ({
  connectorAdapterRegistry,
  systemActions = [],
  rule,
}: Args): string[] => {
  const kibanaPrivileges = systemActions
    .filter((action) => connectorAdapterRegistry.has(action.actionTypeId))
    .map((action) => connectorAdapterRegistry.get(action.actionTypeId))
    .map((adapter) => adapter.getKibanaPrivileges?.({ consumer: rule.consumer }) ?? [])
    .flat();

  return Array.from(new Set(kibanaPrivileges));
};
