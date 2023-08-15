/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CrawlerCustomScheduleMappingClient,
  CrawlerCustomSchedulesServer,
  CrawlerCustomScheduleClient,
  CrawlerCustomScheduleConfigOverridesClient,
} from '../../../../../common/types/crawler';

import {
  CrawlerDomain,
  CrawlerDomainFromServer,
  CrawlerData,
  CrawlerDataFromServer,
  CrawlerDomainValidationResultFromServer,
  CrawlerDomainValidationStep,
  CrawlRequestFromServer,
  CrawlRequest,
  CrawlRequestStats,
  CrawlRequestStatsFromServer,
  CrawlEventFromServer,
  CrawlEvent,
  CrawlConfigFromServer,
  CrawlConfig,
  CrawlRequestWithDetailsFromServer,
  CrawlRequestWithDetails,
  DomainConfig,
  DomainConfigFromServer,
  CrawlerDomainsWithMetaFromServer,
  CrawlerDomainsWithMeta,
  BasicCrawlerAuth,
  CrawlerAuth,
  RawCrawlerAuth,
  CrawlScheduleFromServer,
  CrawlSchedule,
  CrawlerCustomSchedule,
} from './types';

export function crawlerDomainServerToClient(payload: CrawlerDomainFromServer): CrawlerDomain {
  const {
    auth,
    available_deduplication_fields: availableDeduplicationFields,
    crawl_rules: crawlRules,
    created_on: createdOn,
    deduplication_enabled: deduplicationEnabled,
    deduplication_fields: deduplicationFields,
    default_crawl_rule: defaultCrawlRule,
    document_count: documentCount,
    entry_points: entryPoints,
    extraction_rules: extractionRules,
    id,
    last_visited_at: lastCrawl,
    name,
    sitemaps,
  } = payload;

  const clientPayload: CrawlerDomain = {
    auth,
    availableDeduplicationFields,
    crawlRules,
    createdOn,
    deduplicationEnabled,
    deduplicationFields,
    documentCount,
    entryPoints,
    extractionRules,
    id,
    sitemaps,
    url: name,
  };

  if (lastCrawl) {
    clientPayload.lastCrawl = lastCrawl;
  }

  if (defaultCrawlRule) {
    clientPayload.defaultCrawlRule = defaultCrawlRule;
  }

  return clientPayload;
}

export function crawlRequestStatsServerToClient(
  crawlStats: CrawlRequestStatsFromServer
): CrawlRequestStats {
  const {
    status: {
      avg_response_time_msec: avgResponseTimeMSec,
      crawl_duration_msec: crawlDurationMSec,
      pages_visited: pagesVisited,
      urls_allowed: urlsAllowed,
      status_codes: statusCodes,
    },
  } = crawlStats;

  return {
    status: {
      avgResponseTimeMSec,
      crawlDurationMSec,
      pagesVisited,
      statusCodes,
      urlsAllowed,
    },
  };
}

export function crawlRequestServerToClient(crawlRequest: CrawlRequestFromServer): CrawlRequest {
  const {
    id,
    status,
    created_at: createdAt,
    began_at: beganAt,
    completed_at: completedAt,
  } = crawlRequest;

  return {
    beganAt,
    completedAt,
    createdAt,
    id,
    status,
  };
}

export function crawlConfigServerToClient(crawlConfig: CrawlConfigFromServer): CrawlConfig {
  const {
    domain_allowlist: domainAllowlist,
    seed_urls: seedUrls,
    sitemap_urls: sitemapUrls,
    max_crawl_depth: maxCrawlDepth,
  } = crawlConfig;

  return {
    domainAllowlist,
    maxCrawlDepth,
    seedUrls,
    sitemapUrls,
  };
}

export function crawlEventServerToClient(event: CrawlEventFromServer): CrawlEvent {
  const {
    id,
    stage,
    status,
    created_at: createdAt,
    began_at: beganAt,
    completed_at: completedAt,
    type,
    crawl_config: crawlConfig,
  } = event;

  return {
    beganAt,
    completedAt,
    crawlConfig: crawlConfigServerToClient(crawlConfig),
    createdAt,
    id,
    stage,
    status,
    type,
  };
}

export function crawlRequestWithDetailsServerToClient(
  event: CrawlRequestWithDetailsFromServer
): CrawlRequestWithDetails {
  const {
    began_at: beganAt,
    completed_at: completedAt,
    crawl_config: crawlConfig,
    created_at: createdAt,
    id,
    stats: crawlStats,
    status,
    type,
  } = event;

  return {
    beganAt,
    completedAt,
    crawlConfig: crawlConfigServerToClient(crawlConfig),
    createdAt,
    id,
    stats: crawlStats && crawlRequestStatsServerToClient(crawlStats),
    status,
    type,
  };
}

export function crawlerDataServerToClient(payload: CrawlerDataFromServer): CrawlerData {
  const {
    domains,
    events,
    most_recent_crawl_request: mostRecentCrawlRequest,
    user_agent: userAgent,
  } = payload;

  return {
    domains: domains.map((domain) => crawlerDomainServerToClient(domain)),
    events: events.map((event) => crawlEventServerToClient(event)),
    mostRecentCrawlRequest:
      mostRecentCrawlRequest && crawlRequestServerToClient(mostRecentCrawlRequest),
    userAgent,
  };
}

export function crawlDomainValidationToResult(
  data: CrawlerDomainValidationResultFromServer
): CrawlerDomainValidationStep {
  if (!data.valid) {
    return {
      blockingFailure: true,
      message: data.results.find((result) => result.result === 'failure')?.comment,
      state: 'invalid',
    };
  }

  const warningResult = data.results.find((result) => result.result === 'warning');

  if (warningResult) {
    return {
      blockingFailure: !data.valid,
      message: warningResult.comment,
      state: 'warning',
    };
  }

  return {
    state: 'valid',
  };
}

export const domainConfigServerToClient = (
  domainConfigFromServer: DomainConfigFromServer
): DomainConfig => ({
  id: domainConfigFromServer.id,
  name: domainConfigFromServer.name,
  seedUrls: domainConfigFromServer.seed_urls,
  sitemapUrls: domainConfigFromServer.sitemap_urls,
});

export const crawlerCustomSchedulingServerToClient = (
  customSchedulingFromServer: CrawlerCustomSchedulesServer
): CrawlerCustomSchedule[] =>
  Object.entries(customSchedulingFromServer.custom_scheduling).map((scheduleMapping) => {
    const {
      name,
      interval,
      configuration_overrides: configurationOverrides,
      enabled,
    } = scheduleMapping[1];
    const {
      max_crawl_depth: maxCrawlDepth = 2,
      sitemap_discovery_disabled: notIncludeSitemapsInRobotsTxt = false,
      domain_allowlist: selectedDomainUrls = [],
      sitemap_urls: customSitemapUrls = [],
      seed_urls: customEntryPointUrls = [],
    } = configurationOverrides;

    return {
      name,
      interval,
      enabled,
      maxCrawlDepth,
      includeSitemapsInRobotsTxt: !notIncludeSitemapsInRobotsTxt,
      selectedDomainUrls,
      selectedEntryPointUrls: [],
      selectedSitemapUrls: [],
      customEntryPointUrls,
      customSitemapUrls,
    };
  });

export const crawlerCustomSchedulingClientToServer = (
  crawlerCustomSchedules: CrawlerCustomSchedule[]
): CrawlerCustomScheduleMappingClient => {
  const mapToServerFormat = (
    crawlerSchedule: CrawlerCustomSchedule
  ): CrawlerCustomScheduleClient => {
    const configurationOverrides: CrawlerCustomScheduleConfigOverridesClient = {
      maxCrawlDepth: crawlerSchedule.maxCrawlDepth,
      sitemapDiscoveryDisabled: !crawlerSchedule.includeSitemapsInRobotsTxt,
      domainAllowlist: crawlerSchedule.selectedDomainUrls,
      sitemapUrls: [...crawlerSchedule.selectedSitemapUrls, ...crawlerSchedule.customSitemapUrls],
      seedUrls: [
        ...crawlerSchedule.selectedEntryPointUrls,
        ...crawlerSchedule.customEntryPointUrls,
      ],
    };

    return {
      name: crawlerSchedule.name,
      interval: crawlerSchedule.interval,
      configurationOverrides,
      enabled: crawlerSchedule.enabled,
    };
  };

  const customSchedules: CrawlerCustomScheduleMappingClient = crawlerCustomSchedules.reduce(
    (map, schedule) => {
      const scheduleNameFormatted = schedule.name.replace(/\s+/g, '_').toLowerCase();
      map.set(scheduleNameFormatted, mapToServerFormat(schedule));
      return map;
    },
    new Map()
  );
  return customSchedules;
};

export const crawlerDomainsWithMetaServerToClient = ({
  results,
  meta,
}: CrawlerDomainsWithMetaFromServer): CrawlerDomainsWithMeta => ({
  domains: results.map(crawlerDomainServerToClient),
  meta,
});

export const crawlScheduleServerToClient = ({
  frequency,
  unit,
  use_connector_schedule: useConnectorSchedule,
}: CrawlScheduleFromServer): CrawlSchedule => ({
  frequency,
  unit,
  useConnectorSchedule,
});

export function isBasicCrawlerAuth(auth: CrawlerAuth): auth is BasicCrawlerAuth {
  return auth !== null && (auth as BasicCrawlerAuth).type === 'basic';
}

export function isRawCrawlerAuth(auth: CrawlerAuth): auth is RawCrawlerAuth {
  return auth !== null && (auth as RawCrawlerAuth).type === 'raw';
}
