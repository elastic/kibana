/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta } from '../../../../../common/types';

export interface CrawlerDomain {
  documentCount: number;
  id: string;
  lastCrawl?: string;
  url: string;
}

export interface CrawlerDomainFromServer {
  document_count: number;
  id: string;
  last_visited_at?: string;
  name: string;
}

export interface CrawlerDomains {
  domains: CrawlerDomain[];
  meta: Meta;
}

export interface CrawlerDomainsFromServer {
  meta: Meta;
  results: CrawlerDomainFromServer[];
}

export type CrawlEventStage = 'crawl' | 'process';

export enum CrawlType {
  Full = 'full',
  Partial = 'partial',
}

export interface CrawlConfig {
  domainAllowlist: string[];
  seedUrls: string[];
  sitemapUrls: string[];
  maxCrawlDepth: number;
}

export interface CrawlConfigFromServer {
  domain_allowlist: string[];
  seed_urls: string[];
  sitemap_urls: string[];
  max_crawl_depth: number;
}

export type CrawlEventFromServer = CrawlRequestFromServer & {
  stage: CrawlEventStage;
  type: CrawlType;
  crawl_config: CrawlConfigFromServer;
};

export type CrawlEvent = CrawlRequest & {
  stage: CrawlEventStage;
  type: CrawlType;
  crawlConfig: CrawlConfig;
};

// See SharedTogo::Crawler::Status for details on how these are generated
export enum CrawlerStatus {
  Pending = 'pending',
  Suspended = 'suspended',
  Starting = 'starting',
  Running = 'running',
  Suspending = 'suspending',
  Canceling = 'canceling',
  Success = 'success',
  Failed = 'failed',
  Canceled = 'canceled',
  Skipped = 'skipped',
}

export interface CrawlRequestFromServer {
  began_at: string | null;
  completed_at: string | null;
  created_at: string;
  id: string;
  status: CrawlerStatus;
}

export interface CrawlRequest {
  beganAt: string | null;
  completedAt: string | null;
  createdAt: string;
  id: string;
  status: CrawlerStatus;
}

export interface CrawlerData {
  domains: CrawlerDomain[];
  events: CrawlEvent[];
  mostRecentCrawlRequest: CrawlRequest | null;
}

export interface CrawlerDataFromServer {
  domains: CrawlerDomainFromServer[];
  events: CrawlEventFromServer[];
  most_recent_crawl_request: CrawlRequestFromServer | null;
}
