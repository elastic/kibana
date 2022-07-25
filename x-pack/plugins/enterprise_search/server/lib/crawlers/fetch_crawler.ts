/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { CRAWLERS_INDEX } from '../..';

import { Crawler } from '../../../common/types/crawler';

export async function fetchCrawler(
  client: IScopedClusterClient,
  crawlerName: string
): Promise<Crawler | undefined> {
  try {
    const crawlerResult = await client.asCurrentUser.search<Crawler>({
      index: CRAWLERS_INDEX,
      query: { term: { index_name: crawlerName } },
    });
    return crawlerResult.hits.hits[0]?._source;
  } catch {
    return undefined;
  }
}
