/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core-saved-objects-server';

export interface ConnectorsEncryptionKey {
  private_key: string;
  public_key: string;
}

export const CONNECTORS_ENCRYPTION_KEY_TYPE = 'enterprise_search_connectors_encryption_key';

export const connectorsEncryptionKeyType: SavedObjectsType = {
  hidden: true,
  mappings: {
    dynamic: false,
    properties: {
      private_key: {
        type: 'binary',
      },
      public_key: {
        type: 'binary',
      },
    },
  },
  name: CONNECTORS_ENCRYPTION_KEY_TYPE,
  namespaceType: 'agnostic',
};
