/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Setup } from '../helpers/setup_request';

export async function getPermissions(setup: Setup) {
  const { client, indices } = setup;

  const params = {
    index: Object.values(indices),
    body: {
      size: 0,
      query: {
        match_all: {}
      }
    }
  };

  try {
    await client.search(params);
    return { hasPermission: true };
  } catch (e) {
    // If 403, it means the user doesnt have permission.
    if (e.status === 403) {
      return { hasPermission: false };
    }
    // if any other error happens, throw it.
    throw e;
  }
}
