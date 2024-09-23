/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkIfEntityDiscoveryAPIKeyIsValid, readEntityDiscoveryAPIKey } from './auth';
import { getClientsFromAPIKey } from './utils';
import { EntityManagerServerSetup } from '../types';

export async function getScopedClients(server: EntityManagerServerSetup) {
  const apiKey = await readEntityDiscoveryAPIKey(server);
  if (!apiKey) {
    throw new Error('Missing API key');
  }

  const isValid = await checkIfEntityDiscoveryAPIKeyIsValid(server, apiKey);
  if (!isValid) {
    throw new Error(
      'Stored API key is not valid. You can re-enable Entity Discovery to update the key.'
    );
  }

  return getClientsFromAPIKey({ apiKey, server });
}
