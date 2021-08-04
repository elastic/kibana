/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import uuidv5 from 'uuid/v5';
import { Logger } from 'kibana/server';
import { EncryptedSavedObjectsClient } from '../../../encrypted_saved_objects/server';

function deterministicallyRegenerateObjectId(namespace: string, type: string, id: string) {
  return uuidv5(`${namespace}:${type}:${id}`, uuidv5.DNS); // the uuidv5 namespace constant (uuidv5.DNS) is arbitrary
}

export async function resolveSavedObjectId(
  esoClient: EncryptedSavedObjectsClient,
  logger: Logger,
  id: string,
  namespace?: string
) {
  let resolvedId = id;
  let getResult;
  try {
    getResult = await esoClient.getDecryptedAsInternalUser('alert', id, { namespace });
  } catch (err) {
    // Do nothing...
  }

  if (!getResult) {
    resolvedId = deterministicallyRegenerateObjectId(namespace ?? 'default', 'alert', id);
  }

  return resolvedId;
}
