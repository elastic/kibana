/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core/server';

import { Crawler, CrawlRequest } from '../../../common/types/crawler';
import { fetchAll } from '../fetch_all';

const CRAWLER_CONFIGURATIONS_INDEX = '.ent-search-actastic-crawler2_configurations_v2';
const CRAWLER_CRAWL_REQUESTS_INDEX = '.ent-search-actastic-crawler2_crawl_requests_v2';

export const fetchMostRecentCrawlerRequestByConfigurationId = async (
  client: IScopedClusterClient,
  configurationId: string
): Promise<CrawlRequest | undefined> => {
  try {
    const crawlRequestResult = await client.asCurrentUser.search<CrawlRequest>({
      index: CRAWLER_CRAWL_REQUESTS_INDEX,
      query: { term: { configuration_oid: configurationId } },
      sort: 'created_at:desc',
    });
    const result = crawlRequestResult.hits.hits[0]?._source;

    return result;
  } catch (error) {
    return undefined;
  }
};

export const fetchCrawlerByIndexName = async (
  client: IScopedClusterClient,
  indexName: string
): Promise<Crawler | undefined> => {
  let crawler: Crawler | undefined;
  try {
    const crawlerResult = await client.asCurrentUser.search<Crawler>({
      index: CRAWLER_CONFIGURATIONS_INDEX,
      query: { term: { index_name: indexName } },
    });
    crawler = crawlerResult.hits.hits[0]?._source;
  } catch (error) {
    return undefined;
  }

  if (crawler) {
    try {
      const mostRecentCrawlRequest = await fetchMostRecentCrawlerRequestByConfigurationId(
        client,
        crawler.id
      );

      return {
        ...crawler,
        most_recent_crawl_request_status: mostRecentCrawlRequest?.status,
      };
    } catch (error) {
      return crawler;
    }
  }

  return undefined;
};

export const fetchCrawlers = async (
  client: IScopedClusterClient,
  indexNames?: string[]
): Promise<Crawler[]> => {
  const query: QueryDslQueryContainer = indexNames
    ? { terms: { index_name: indexNames } }
    : { match_all: {} };
  let crawlers: Crawler[];
  try {
    crawlers = await fetchAll<Crawler>(client, CRAWLER_CONFIGURATIONS_INDEX, query);
  } catch (error) {
    return [];
  }

  try {
    // TODO replace this with an aggregation query
    const crawlersWithStatuses = await Promise.all(
      crawlers.map(async (crawler): Promise<Crawler> => {
        const mostRecentCrawlRequest = await fetchMostRecentCrawlerRequestByConfigurationId(
          client,
          crawler.id
        );

        return {
          ...crawler,
          most_recent_crawl_request_status: mostRecentCrawlRequest?.status,
        };
      })
    );
    return crawlersWithStatuses;
  } catch (error) {
    return crawlers;
  }
};
