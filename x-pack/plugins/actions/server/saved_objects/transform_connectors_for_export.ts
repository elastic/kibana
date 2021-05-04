/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from 'kibana/server';
import { ActionTypeRegistry } from '../action_type_registry';
import { validateSecrets } from '../lib';
import { RawAction, ActionType } from '../types';

export function transformConnectorsForExport(
  connectors: SavedObject[],
  actionTypeRegistry: ActionTypeRegistry
): Array<SavedObject<RawAction>> {
  return connectors.map((c) => {
    const connector = c as SavedObject<RawAction>;
    return transformConnectorForExport(
      connector,
      actionTypeRegistry.get(connector.attributes.actionTypeId)
    );
  });
}

function connectorHasNoAuth(connector: SavedObject<RawAction>) {
  return connector?.attributes?.config?.hasAuth === false;
}

function transformConnectorForExport(
  connector: SavedObject<RawAction>,
  actionType: ActionType
): SavedObject<RawAction> {
  let isMissingSecrets = false;
  try {
    validateSecrets(actionType, connector.attributes.secrets);
  } catch (err) {
    isMissingSecrets = !connectorHasNoAuth(connector);
  }

  // Skip connectors
  return {
    ...connector,
    attributes: {
      ...connector.attributes,
      isMissingSecrets,
    },
  };
}
