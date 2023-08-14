/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '../..';

import {
  CrawlerCustomScheduleMappingServer,
  CrawlerCustomScheduleMappingClient,
  CrawlerCustomScheduleServer,
} from '../../../common/types/crawler';

import { fetchCrawlerDocumentIdByIndexName } from './fetch_crawlers';

const convertCustomScheduleMappingClientToServer = (
  customSchedules: CrawlerCustomScheduleMappingClient
): CrawlerCustomScheduleMappingServer => {
  const customSchedulesServer = Array.from(customSchedules, ([scheduleName, customSchedule]) => {
    const { name, interval, configurationOverrides, enabled } = customSchedule;

    const {
      maxCrawlDepth: max_crawl_depth,
      sitemapDiscoveryDisabled: sitemap_discovery_disabled,
      domainAllowlist: domain_allowlist,
      sitemapUrls: sitemap_urls,
      seedUrls: seed_urls,
    } = configurationOverrides;

    const scheduleServer: CrawlerCustomScheduleServer = {
      name,
      interval,
      configuration_overrides: {
        max_crawl_depth,
        sitemap_discovery_disabled,
        domain_allowlist,
        sitemap_urls,
        seed_urls,
      },
      enabled,
    };

    return [scheduleName, scheduleServer];
  }).reduce((map, scheduleEntry) => {
    const [name, schedule] = scheduleEntry;
    map.set(name, schedule);
    return map;
  }, new Map());
  return customSchedulesServer;
};

export const postCrawlerCustomScheduling = async (
  client: IScopedClusterClient,
  indexName: string,
  customSchedules: CrawlerCustomScheduleMappingClient
) => {
  const connectorId = await fetchCrawlerDocumentIdByIndexName(client, indexName);
  const convertCustomSchedulesServer = convertCustomScheduleMappingClientToServer(customSchedules);
  return await client.asCurrentUser.update({
    index: CONNECTORS_INDEX,
    id: connectorId,
    doc: {
      custom_scheduling: Object.fromEntries(convertCustomSchedulesServer),
    },
  });
};
