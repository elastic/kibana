/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TriggersAndActionsUIPublicPluginStart } from '../../../../triggers_actions_ui/public';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { actionTypeRegistryMock } from '../../../../triggers_actions_ui/public/application/action_type_registry.mock';
import { CaseActionConnector } from '../../../common';

const getUniqueActionTypeIds = (connectors: CaseActionConnector[]) =>
  new Set(connectors.map((connector) => connector.actionTypeId));

export const registerConnectorsToMockActionRegistry = (
  actionTypeRegistry: TriggersAndActionsUIPublicPluginStart['actionTypeRegistry'],
  connectors: CaseActionConnector[]
) => {
  const { createMockActionTypeModel } = actionTypeRegistryMock;
  const uniqueActionTypeIds = getUniqueActionTypeIds(connectors);
  uniqueActionTypeIds.forEach((actionTypeId) =>
    actionTypeRegistry.register(
      createMockActionTypeModel({ id: actionTypeId, iconClass: 'logoSecurity' })
    )
  );
};
