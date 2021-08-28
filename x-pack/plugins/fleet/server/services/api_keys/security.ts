/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../app_context';

export async function invalidateAPIKeys(ids: string[]) {
  const security = appContextService.getSecurity();
  if (!security) {
    throw new Error('Missing security plugin');
  }

  try {
    const res = await security.authc.apiKeys.invalidateAsInternalUser({
      ids,
    });

    return res;
  } catch (err) {
    throw err;
  }
}
