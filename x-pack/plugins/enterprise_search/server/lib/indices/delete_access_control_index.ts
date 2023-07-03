/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_ACCESS_CONTROL_INDEX_PREFIX } from '../..';

export const deleteAccessControlIndex = async (client: IScopedClusterClient, index: string) => {
  const accessControlExists = await client.asCurrentUser.indices.exists({
    index: index.replace('search-', CONNECTORS_ACCESS_CONTROL_INDEX_PREFIX),
  });
  if (accessControlExists) {
    await client.asCurrentUser.indices.delete({
      index: index.replace('search-', CONNECTORS_ACCESS_CONTROL_INDEX_PREFIX),
    });
  }
};
