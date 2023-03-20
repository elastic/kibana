/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import semverCoerce from 'semver/functions/coerce';

export interface NewsItem {
  title: { en: string };
  description: { en: string };
  link_url: { en: string };
  image_url?: { en: string } | null;
}

interface NewsFeed {
  items: NewsItem[];
}
/**
 * Removes the suffix that is sometimes appended to the Kibana version,
 * (e.g. `8.0.0-SNAPSHOT-rc1`), which is typically only seen in non-production
 * environments
 */
const removeSuffixFromVersion = (kibanaVersion?: string) =>
  semverCoerce(kibanaVersion)?.version ?? kibanaVersion;

export async function getNewsFeed({
  http,
  kibanaVersion,
}: {
  http: HttpSetup;
  kibanaVersion: string;
}): Promise<NewsFeed> {
  try {
    return await http.get(
      `https://feeds.elastic.co/observability-solution/v${removeSuffixFromVersion(
        kibanaVersion
      )}.json`
    );
  } catch (e) {
    console.error('Error while fetching news feed', e);
    return { items: [] };
  }
}
