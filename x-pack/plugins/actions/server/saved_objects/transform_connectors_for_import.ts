/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/server';
import { RawAction } from '../types';

export function transformConnectorsForImport(connectors: SavedObject[]) {
  for (const c of connectors) {
    const connector = c as SavedObject<RawAction>;
    // If a connector is not missing secrets, set secrets to an empty object
    // because the secrets object is required to not be null/undefined
    const isMissingSecrets = (connector?.attributes?.isMissingSecrets as boolean) ?? false;
    if (!isMissingSecrets) {
      connector.attributes.secrets = {};
    }
  }
}
