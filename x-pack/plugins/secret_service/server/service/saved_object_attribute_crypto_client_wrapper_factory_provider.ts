/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientWrapperOptions } from 'src/legacy/server/saved_objects/service/lib/scoped_client_provider';
import { SavedObjectAttributeCryptoClient } from './saved_object_attribute_crypto_client';

export function SavedObjectAttributeCryptoClientWrapperFactoryProvider(info: any) {
  return (options: SavedObjectsClientWrapperOptions) => {
    const { client, request } = options;
    return new SavedObjectAttributeCryptoClient(client, request, info);
  };
}
