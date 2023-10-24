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
import { NormalizedSystemAction } from '../rules_client';
import { RuleSystemAction } from '../types';
interface ValidateSystemActionsWithRuleTypeIdParams {
  connectorAdapterRegistry: ConnectorAdapterRegistry;
  systemActions: RuleSystemAction[];
}

interface ValidateSystemActionsWithoutRuleTypeIdParams {
  actionsClient: ActionsClient;
  connectorAdapterRegistry: ConnectorAdapterRegistry;
  systemActions: Array<RuleSystemAction | NormalizedSystemAction>;
}

export const validateSystemActionsWithRuleTypeId = ({
  connectorAdapterRegistry,
  systemActions,
}: ValidateSystemActionsWithRuleTypeIdParams) => {
  if (systemActions.length === 0) {
    return;
  }

  bulkValidateConnectorAdapterActionParams({
    connectorAdapterRegistry,
    actions: systemActions,
  });
};

export const validateSystemActionsWithoutRuleTypeId = async ({
  actionsClient,
  connectorAdapterRegistry,
  systemActions,
}: ValidateSystemActionsWithoutRuleTypeIdParams) => {
  if (systemActions.length === 0) {
    return;
  }

  /**
   * When updating or creating a rule the actions may not contain
   * the actionTypeId (for example: bulk operations). We need to getBulk using the
   * actionsClient to get the actionTypeId of each action.
   * The actionTypeId is needed to get the schema of
   * the action params using the connector adapter registry
   */
  const actionIds: string[] = systemActions.map((action) => action.id);

  const actionResults = await actionsClient.getBulk({ ids: actionIds, throwIfSystemAction: false });
  const systemActionsWithActionTypeId: RuleSystemAction[] = [];

  for (const systemAction of systemActions) {
    const isSystemAction = actionsClient.isSystemAction(systemAction.id);
    const foundAction = actionResults.find((actionRes) => actionRes.id === systemAction.id);

    if (!isSystemAction || !foundAction) {
      throw Boom.badRequest(`Action ${systemAction.id} is not a system action`);
    }

    systemActionsWithActionTypeId.push({
      ...systemAction,
      actionTypeId: foundAction.actionTypeId,
    });
  }

  bulkValidateConnectorAdapterActionParams({
    connectorAdapterRegistry,
    actions: systemActionsWithActionTypeId,
  });
};
