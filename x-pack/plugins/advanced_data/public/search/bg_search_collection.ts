/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectsClient,
  SimpleSavedObject,
  SavedObjectAttributes,
  SavedObjectsClientContract,
} from 'kibana/public';

export interface BackgroundSearch {
  id: string;
  type: string;
  request: string;
}

export interface BackgroundSearchCollection extends SavedObjectAttributes {
  url: string;
  name: string;
  searches: BackgroundSearch[];
}

export async function getBgSearchCollections(
  client: SavedObjectsClientContract
): Promise<Array<SimpleSavedObject<BackgroundSearchCollection>>> {
  return (
    await client.find<BackgroundSearchCollection>({
      type: 'bgSearchCollection',
      perPage: 10000,
    })
  ).savedObjects;
}

export async function getBgSearchCollection(
  client: SavedObjectsClientContract,
  id: string
): Promise<SimpleSavedObject<BackgroundSearchCollection>> {
  return await client.get<BackgroundSearchCollection>('bgSearchCollection', id);
}

export interface CreateBgSearchOptions {
  searches: Array<{ id: string; type?: string }>;
  name: string;
  url: string;
  id: string;
  state: string;
}

export const createBgSearchCollection = (
  client: SavedObjectsClientContract,
  { name, url, searches, id }: CreateBgSearchOptions
) => {
  return client.create<BackgroundSearchCollection>(
    'bgSearchCollection',
    {
      name,
      url,
      searches,
    },
    {
      id,
    }
  );
};
