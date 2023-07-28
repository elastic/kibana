/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { ActionsClient } from '@kbn/actions-plugin/server';
import { ConnectorAdapterRegistry } from '../connector_adapters/connector_adapter_registry';
import { bulkValidateConnectorAdapterActionParams } from '../connector_adapters/validate_rule_action_params';
import { RuleSystemAction } from '../types';

interface Params {
  actionsClient: ActionsClient;
  connectorAdapterRegistry: ConnectorAdapterRegistry;
  systemActions: RuleSystemAction[];
}

export const validateSystemActions = ({
  actionsClient,
  connectorAdapterRegistry,
  systemActions,
}: Params) => {
  for (const action of systemActions) {
    const isSystemAction = actionsClient.isSystemAction(action.id);

    if (!isSystemAction) {
      throw Boom.badRequest(
        `Action ${action.id} of type ${action.actionTypeId} is not a system action`
      );
    }
  }

  bulkValidateConnectorAdapterActionParams({
    connectorAdapterRegistry,
    actions: systemActions,
  });
};
