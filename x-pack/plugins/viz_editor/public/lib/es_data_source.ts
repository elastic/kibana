/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { SavedObjectsClient } from 'ui/saved_objects';

export interface DataSourceField {
  name: string;
  type: string;
}

export interface DataSource {
  name: string;
  fields: DataSourceField[];
}

export function empty(): DataSource {
  return {
    name: 'No index pattern',
    fields: [],
  };
}

export async function load(): Promise<DataSource> {
  const client = chrome.getSavedObjectsClient();
  const indexPattern = await fetchIndexPattern(client, 'ff959d40-b880-11e8-a6d9-e546fe2bba5f');

  if (!indexPattern) {
    return empty();
  }

  const { attributes } = indexPattern as any;

  return {
    name: attributes.title,
    fields: (JSON.parse(attributes.fields) as DataSourceField[]).sort((a, b) =>
      a.name.localeCompare(b.name)
    ),
  };
}

async function fetchIndexPattern(client: SavedObjectsClient, id?: string) {
  if (id) {
    return client.get('index-pattern', id);
  }

  const { savedObjects } = await client.find({
    type: 'index-pattern',
    perPage: 1,
  });

  return savedObjects[0];
}
