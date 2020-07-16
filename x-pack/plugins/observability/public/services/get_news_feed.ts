/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AppMountContext } from 'kibana/public';

export interface NewsItem {
  title: { en: string };
  description: { en: string };
  link_url: { en: string };
  image_url?: { en: string } | null;
}

interface NewsFeed {
  items: NewsItem[];
}

export async function getNewsFeed({ core }: { core: AppMountContext['core'] }): Promise<NewsFeed> {
  try {
    return await core.http.get('https://feeds.elastic.co/observability-solution/v8.0.0.json');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error while fetching news feed', e);
    return { items: [] };
  }
}
