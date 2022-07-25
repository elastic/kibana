/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
} from './types';

export function crawlerDomainServerToClient(payload: CrawlerDomainFromServer): CrawlerDomain {
  const {
    id,
    name,
    sitemaps,
    created_on: createdOn,
    last_visited_at: lastCrawl,
    document_count: documentCount,
    crawl_rules: crawlRules,
    default_crawl_rule: defaultCrawlRule,
    entry_points: entryPoints,
    deduplication_enabled: deduplicationEnabled,
    deduplication_fields: deduplicationFields,
    available_deduplication_fields: availableDeduplicationFields,
  } = payload;

  const clientPayload: CrawlerDomain = {
    availableDeduplicationFields,
    crawlRules,
    createdOn,
    deduplicationEnabled,
    deduplicationFields,
    documentCount,
    entryPoints,
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
  const { domains, events, most_recent_crawl_request: mostRecentCrawlRequest } = payload;

  return {
    domains: domains.map((domain) => crawlerDomainServerToClient(domain)),
    events: events.map((event) => crawlEventServerToClient(event)),
    mostRecentCrawlRequest:
      mostRecentCrawlRequest && crawlRequestServerToClient(mostRecentCrawlRequest),
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

export const crawlerDomainsWithMetaServerToClient = ({
  results,
  meta,
}: CrawlerDomainsWithMetaFromServer): CrawlerDomainsWithMeta => ({
  domains: results.map(crawlerDomainServerToClient),
  meta,
});
