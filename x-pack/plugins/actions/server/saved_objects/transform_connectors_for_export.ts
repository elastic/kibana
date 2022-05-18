/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/server';
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

function transformConnectorForExport(
  connector: SavedObject<RawAction>,
  actionType: ActionType
): SavedObject<RawAction> {
  let isMissingSecrets = false;
  try {
    // If connector requires secrets, this will throw an error
    validateSecrets(actionType, {});

    // If connector has optional (or no) secrets, set isMissingSecrets value to value of hasAuth
    // If connector doesn't have hasAuth value, default to isMissingSecrets: false
    isMissingSecrets = (connector?.attributes?.config?.hasAuth as boolean) ?? false;
  } catch (err) {
    isMissingSecrets = true;
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
