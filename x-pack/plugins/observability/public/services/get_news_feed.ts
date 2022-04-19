/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';

export interface NewsItem {
  title: { en: string };
  description: { en: string };
  link_url: { en: string };
  image_url?: { en: string } | null;
}

interface NewsFeed {
  items: NewsItem[];
}

export async function getNewsFeed({ http }: { http: HttpSetup }): Promise<NewsFeed> {
  try {
    return await http.get('https://feeds.elastic.co/observability-solution/v8.0.0.json');
  } catch (e) {
    console.error('Error while fetching news feed', e);
    return { items: [] };
  }
}
