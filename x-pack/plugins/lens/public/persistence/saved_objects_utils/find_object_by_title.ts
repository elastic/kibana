/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectIndexStore } from '..';

/** Returns an object matching a given title */
export async function findObjectByTitle(
  client: SavedObjectIndexStore,
  type: string,
  title: string
) {
  if (!title) {
    return;
  }

  const response = await client.search(
    {
      limit: 10,
      text: `"${title}"`,
    },
    {
      searchFields: ['title'],
    }
  );
  return response.hits.find((obj) => obj.attributes.title.toLowerCase() === title.toLowerCase());
}
