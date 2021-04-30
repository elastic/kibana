/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from 'kibana/server';
import { RawAction } from '../types';

const CONNECTORS_WITHOUT_SECRETS = ['.index', '.server-log'];
const CONNECTORS_CHECK_AUTH = ['.email', '.webhook'];

export function transformConnectorsForExport(
  connectors: SavedObject[]
): Array<SavedObject<RawAction>> {
  return connectors.map((connector) =>
    transformConnectorForExport(connector as SavedObject<RawAction>)
  );
}

function connectorHasNoAuth(connector: SavedObject<RawAction>) {
  return connector?.attributes?.config?.hasAuth === false;
}

function transformConnectorForExport(connector: SavedObject<RawAction>): SavedObject<RawAction> {
  // Skip connectors with no secrets
  if (CONNECTORS_WITHOUT_SECRETS.includes(connector.attributes.actionTypeId)) {
    return connector;
  }

  // Skip connectors where hasAuth = false
  if (
    CONNECTORS_CHECK_AUTH.includes(connector.attributes.actionTypeId) &&
    connectorHasNoAuth(connector)
  ) {
    return connector;
  }

  // Skip connectors
  return {
    ...connector,
    attributes: {
      ...connector.attributes,
      isMissingSecrets: true,
    },
  };
}
