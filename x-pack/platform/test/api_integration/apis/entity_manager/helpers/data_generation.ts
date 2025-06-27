/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { MappingProperty, PropertyName } from '@elastic/elasticsearch/lib/api/types';

export async function createIndexWithDocuments(
  client: Client,
  options: {
    index: string;
    properties: Record<PropertyName, MappingProperty>;
    documents: Array<Record<string, any>>;
  }
) {
  await client.indices.create({
    index: options.index,
    mappings: {
      dynamic: false,
      properties: options.properties,
    },
  });

  const operations = options.documents.flatMap((doc) => {
    return [{ create: { _index: options.index } }, doc];
  });

  await client.bulk({
    operations,
    refresh: 'wait_for',
  });

  return () => client.indices.delete({ index: options.index });
}
