/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CrawlConfig,
  CrawlConfigFromServer,
  CrawlerData,
  CrawlerDataFromServer,
  CrawlerDomain,
  CrawlerDomainFromServer,
  CrawlerDomains,
  CrawlerDomainsFromServer,
  CrawlEvent,
  CrawlEventFromServer,
  CrawlRequest,
  CrawlRequestFromServer,
} from './types';

export function crawlerDomainServerToClient(payload: CrawlerDomainFromServer): CrawlerDomain {
  const { id, name: url, last_visited_at: lastCrawl, document_count: documentCount } = payload;

  const clientPayload: CrawlerDomain = {
    documentCount,
    id,
    url,
  };

  if (lastCrawl) {
    clientPayload.lastCrawl = lastCrawl;
  }

  return clientPayload;
}

export function crawlerDomainsServerToClient({
  meta,
  results,
}: CrawlerDomainsFromServer): CrawlerDomains {
  return { domains: results.map(crawlerDomainServerToClient), meta };
}

export function crawlRequestServerToClient(crawlRequest: CrawlRequestFromServer): CrawlRequest {
  const {
    began_at: beganAt,
    completed_at: completedAt,
    created_at: createdAt,
    id,
    status,
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
    seedUrls,
    sitemapUrls,
    maxCrawlDepth,
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
    id,
    stage,
    status,
    createdAt,
    beganAt,
    completedAt,
    type,
    crawlConfig: crawlConfigServerToClient(crawlConfig),
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
