/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ContentClient } from '@kbn/content-management-plugin/public';
import { CONTENT_ID, GraphSearchIn, GraphSearchOut } from '../../../common/content_management';

/** Returns an object matching a given title */
export async function findObjectByTitle(contentClient: ContentClient, title: string) {
  if (!title) {
    return;
  }

  // Elastic search will return the most relevant results first, which means exact matches should come
  // first, and so we shouldn't need to request everything. Using 10 just to be on the safe side.
  const response = await contentClient.search<GraphSearchIn, GraphSearchOut>({
    contentTypeId: CONTENT_ID,
    query: {
      text: `"${title}"`,
    },
    options: {
      searchFields: ['title'],
    },
  });
  return response.hits.find((obj) => obj.attributes.title.toLowerCase() === title.toLowerCase());
}
