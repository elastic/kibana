/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from 'kibana/public';

export interface NewsItem {
  title: { en: string };
  description: { en: string };
  link_url: { en: string };
  image_url?: { en: string } | null;
}

interface NewsFeed {
  items: NewsItem[];
}

export async function getNewsFeed({ core }: { core: CoreStart }): Promise<NewsFeed> {
  try {
    return await core.http.get('https://feeds.elastic.co/observability-solution/v8.0.0.json');
  } catch (e) {
    console.error('Error while fetching news feed', e);
    return { items: [] };
  }
}
