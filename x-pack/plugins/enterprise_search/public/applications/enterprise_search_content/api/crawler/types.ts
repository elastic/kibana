/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta } from '../../../../../common/types';
import { CrawlerStatus } from '../../../../../common/types/crawler';
import { ExtractionRule } from '../../../../../common/types/extraction_rules';

// TODO remove this proxy export, which will affect a lot of files
export { CrawlerStatus };

export enum CrawlerPolicies {
  allow = 'allow',
  deny = 'deny',
}

export enum CrawlerRules {
  beginsWith = 'begins',
  endsWith = 'ends',
  contains = 'contains',
  regex = 'regex',
}

export interface CrawlRule {
  id: string;
  pattern: string;
  policy: CrawlerPolicies;
  rule: CrawlerRules;
}

export interface EntryPoint {
  id: string;
  value: string;
}

export interface Sitemap {
  id: string;
  url: string;
}

export type CrawlerDomainValidationStepState = '' | 'loading' | 'valid' | 'warning' | 'invalid';

// The BE uses a singular form of each unit
// See shared_togo/app/models/shared_togo/crawler/crawl_schedule.rb
export enum CrawlUnits {
  hours = 'hour',
  days = 'day',
  weeks = 'week',
  months = 'month',
}

export type CrawlerDomainValidationStepName =
  | 'initialValidation'
  | 'networkConnectivity'
  | 'indexingRestrictions'
  | 'contentVerification';

export type CrawlEventStage = 'crawl' | 'process';

export enum CrawlType {
  Full = 'full',
  Partial = 'partial',
}

export interface BasicCrawlerAuth {
  password: string;
  type: 'basic';
  username: string;
}

export interface RawCrawlerAuth {
  header: string;
  type: 'raw';
}

export type CrawlerAuth = BasicCrawlerAuth | RawCrawlerAuth | null;

// Server

export interface CrawlerDomainFromServer {
  auth: CrawlerAuth;
  available_deduplication_fields: string[];
  crawl_rules: CrawlRule[];
  created_on: string;
  deduplication_enabled: boolean;
  deduplication_fields: string[];
  default_crawl_rule?: CrawlRule;
  document_count: number;
  entry_points: EntryPoint[];
  extraction_rules: ExtractionRule[];
  id: string;
  last_visited_at?: string;
  name: string;
  sitemaps: Sitemap[];
}

export interface CrawlerDomainsWithMetaFromServer {
  meta: Meta;
  results: CrawlerDomainFromServer[];
}

export interface CrawlerDataFromServer {
  domains: CrawlerDomainFromServer[];
  events: CrawlEventFromServer[];
  most_recent_crawl_request: CrawlRequestFromServer | null;
  user_agent: string;
}

export interface CrawlerDomainValidationResultFromServer {
  results: Array<{
    comment: string;
    name: string;
    result: 'ok' | 'warning' | 'failure';
  }>;
  valid: boolean;
}

export interface CrawlRequestFromServer {
  began_at: string | null;
  completed_at: string | null;
  created_at: string;
  id: string;
  status: CrawlerStatus;
}

export interface CrawlRequestStatsFromServer {
  status: {
    avg_response_time_msec?: number;
    crawl_duration_msec?: number;
    pages_visited?: number;
    status_codes?: {
      [code: string]: number;
    };
    urls_allowed?: number;
  };
}

export interface CrawlConfigFromServer {
  domain_allowlist: string[];
  max_crawl_depth: number;
  seed_urls: string[];
  sitemap_urls: string[];
}

export type CrawlRequestWithDetailsFromServer = CrawlRequestFromServer & {
  crawl_config: CrawlConfigFromServer;
  stats: CrawlRequestStatsFromServer;
  type: CrawlType;
};

export type CrawlEventFromServer = CrawlRequestFromServer & {
  crawl_config: CrawlConfigFromServer;
  stage: CrawlEventStage;
  type: CrawlType;
};

export interface DomainConfigFromServer {
  id: string;
  name: string;
  seed_urls: string[];
  sitemap_urls: string[];
}

export interface CrawlScheduleFromServer {
  frequency: number;
  unit: CrawlUnits;
  use_connector_schedule: boolean;
}

// Client

export interface CrawlerCustomSchedule {
  name: string;
  customEntryPointUrls: string[];
  customSitemapUrls: string[];
  includeSitemapsInRobotsTxt: boolean;
  maxCrawlDepth: number;
  selectedDomainUrls: string[];
  selectedEntryPointUrls: string[];
  selectedSitemapUrls: string[];
  interval: string; // interval has crontab syntax
  enabled: boolean;
}

export enum CustomCrawlType {
  ONE_TIME = 'one-time',
  MULTIPLE = 'multiple',
}

export interface CrawlerDomain {
  auth: CrawlerAuth;
  availableDeduplicationFields: string[];
  crawlRules: CrawlRule[];
  createdOn: string;
  deduplicationEnabled: boolean;
  deduplicationFields: string[];
  defaultCrawlRule?: CrawlRule;
  documentCount: number;
  entryPoints: EntryPoint[];
  extractionRules: ExtractionRule[];
  id: string;
  lastCrawl?: string;
  sitemaps: Sitemap[];
  url: string;
}

export interface CrawlerDomainsWithMeta {
  domains: CrawlerDomain[];
  meta: Meta;
}

export interface CrawlerData {
  domains: CrawlerDomain[];
  events: CrawlEvent[];
  mostRecentCrawlRequest: CrawlRequest | null;
  userAgent: string;
}

export interface CrawlerDomainValidationStep {
  blockingFailure?: boolean;
  message?: string;
  state: CrawlerDomainValidationStepState;
}

interface CrawlerDomainValidationState {
  contentVerification: CrawlerDomainValidationStep;
  indexingRestrictions: CrawlerDomainValidationStep;
  initialValidation: CrawlerDomainValidationStep;
  networkConnectivity: CrawlerDomainValidationStep;
}

export interface CrawlerDomainValidationResult {
  steps: CrawlerDomainValidationState;
}

export type CrawlerDomainValidationResultChange = Partial<CrawlerDomainValidationState>;

export interface CrawlRequest {
  beganAt: string | null;
  completedAt: string | null;
  createdAt: string;
  id: string;
  status: CrawlerStatus;
}

export interface CrawlRequestStats {
  status: {
    avgResponseTimeMSec?: number;
    crawlDurationMSec?: number;
    pagesVisited?: number;
    statusCodes?: {
      [code: string]: number;
    };
    urlsAllowed?: number;
  };
}

export interface CrawlConfig {
  domainAllowlist: string[];
  maxCrawlDepth: number;
  seedUrls: string[];
  sitemapUrls: string[];
}

export type CrawlRequestWithDetails = CrawlRequest & {
  crawlConfig: CrawlConfig;
  stats: CrawlRequestStats | null;
  type: CrawlType;
};

export type CrawlEvent = CrawlRequest & {
  crawlConfig: CrawlConfig;
  stage: CrawlEventStage;
  type: CrawlType;
};

export interface CrawlSchedule {
  frequency: number;
  unit: CrawlUnits;
  useConnectorSchedule: boolean;
}

export interface DomainConfig {
  id: string;
  name: string;
  seedUrls: string[];
  sitemapUrls: string[];
}
