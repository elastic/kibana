/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { isIndexNotFoundException } from '@kbn/core-saved-objects-migration-server-internal';

import { CONNECTORS_INDEX } from '../..';

export async function fetchConnectorIndexNames(client: IScopedClusterClient): Promise<string[]> {
  try {
    const result = await client.asCurrentUser.search({
      _source: false,
      fields: [{ field: 'index_name' }],
      index: CONNECTORS_INDEX,
      size: 10000,
    });
    return (result?.hits.hits ?? []).map((field) => field.fields?.index_name[0] ?? '');
  } catch (error) {
    if (isIndexNotFoundException(error)) {
      return [];
    }
    throw error;
  }
}
