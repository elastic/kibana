/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectClient } from 'src/legacy/server/saved_objects/service/saved_objects_client';
import { SavedObjectAttributeCryptoClient } from './saved_object_attribute_crypto_client';

export function SavedObjectAttributeCryptoClientWrapperFactoryProvider(info) {
  return (request: any, client: SavedObjectClient) => {
    return new SavedObjectAttributeCryptoClient(client, request, info);
  };
}
