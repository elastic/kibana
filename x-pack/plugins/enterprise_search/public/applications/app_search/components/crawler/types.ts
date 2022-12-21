/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export enum CrawlerPolicies {
  allow = 'allow',
  deny = 'deny',
}

export const getReadableCrawlerPolicy = (policy: CrawlerPolicies) => {
  switch (policy) {
    case CrawlerPolicies.allow:
      return i18n.translate(
        'xpack.enterpriseSearch.appSearch.crawler.crawlRulesPolicies.allowLabel',
        {
          defaultMessage: 'Allow',
        }
      );
    case CrawlerPolicies.deny:
      return i18n.translate(
        'xpack.enterpriseSearch.appSearch.crawler.crawlRulesPolicies.disallowLabel',
        {
          defaultMessage: 'Disallow',
        }
      );
  }
};

export enum CrawlerRules {
  beginsWith = 'begins',
  endsWith = 'ends',
  contains = 'contains',
  regex = 'regex',
}

export const getReadableCrawlerRule = (rule: CrawlerRules) => {
  switch (rule) {
    case CrawlerRules.beginsWith:
      return i18n.translate(
        'xpack.enterpriseSearch.appSearch.crawler.crawlRulesCrawlerRules.beginsWithLabel',
        {
          defaultMessage: 'Begins with',
        }
      );
    case CrawlerRules.endsWith:
      return i18n.translate(
        'xpack.enterpriseSearch.appSearch.crawler.crawlRulesCrawlerRules.endsWithLabel',
        {
          defaultMessage: 'Ends with',
        }
      );
    case CrawlerRules.contains:
      return i18n.translate(
        'xpack.enterpriseSearch.appSearch.crawler.crawlRulesCrawlerRules.containsLabel',
        {
          defaultMessage: 'Contains',
        }
      );
    case CrawlerRules.regex:
      return i18n.translate(
        'xpack.enterpriseSearch.appSearch.crawler.crawlRulesCrawlerRules.regexLabel',
        {
          defaultMessage: 'Regex',
        }
      );
  }
};

export interface CrawlRule {
  id: string;
  policy: CrawlerPolicies;
  rule: CrawlerRules;
  pattern: string;
}

export interface EntryPoint {
  id: string;
  value: string;
}

export interface Sitemap {
  id: string;
  url: string;
}

export interface CrawlerDomain {
  createdOn: string;
  documentCount: number;
  id: string;
  lastCrawl?: string;
  url: string;
  crawlRules: CrawlRule[];
  defaultCrawlRule?: CrawlRule;
  entryPoints: EntryPoint[];
  sitemaps: Sitemap[];
  deduplicationEnabled: boolean;
  deduplicationFields: string[];
  availableDeduplicationFields: string[];
}

export interface CrawlerDomainFromServer {
  id: string;
  name: string;
  created_on: string;
  last_visited_at?: string;
  document_count: number;
  crawl_rules: CrawlRule[];
  default_crawl_rule?: CrawlRule;
  entry_points: EntryPoint[];
  sitemaps: Sitemap[];
  deduplication_enabled: boolean;
  deduplication_fields: string[];
  available_deduplication_fields: string[];
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

export interface CrawlerDomainValidationResultFromServer {
  valid: boolean;
  results: Array<{
    name: string;
    result: 'ok' | 'warning' | 'failure';
    comment: string;
  }>;
}

export type CrawlerDomainValidationStepState = '' | 'loading' | 'valid' | 'warning' | 'invalid';

export interface CrawlerDomainValidationStep {
  state: CrawlerDomainValidationStepState;
  blockingFailure?: boolean;
  message?: string;
}

interface CrawlerDomainValidationState {
  initialValidation: CrawlerDomainValidationStep;
  networkConnectivity: CrawlerDomainValidationStep;
  indexingRestrictions: CrawlerDomainValidationStep;
  contentVerification: CrawlerDomainValidationStep;
}

export interface CrawlerDomainValidationResult {
  steps: CrawlerDomainValidationState;
}

export type CrawlerDomainValidationResultChange = Partial<CrawlerDomainValidationState>;

export type CrawlerDomainValidationStepName =
  | 'initialValidation'
  | 'networkConnectivity'
  | 'indexingRestrictions'
  | 'contentVerification';
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

export enum CrawlType {
  Full = 'full',
  Partial = 'partial',
}
export interface CrawlRequestFromServer {
  id: string;
  status: CrawlerStatus;
  created_at: string;
  began_at: string | null;
  completed_at: string | null;
}

export interface CrawlRequest {
  id: string;
  status: CrawlerStatus;
  createdAt: string;
  beganAt: string | null;
  completedAt: string | null;
}

export interface CrawlRequestStats {
  status: {
    avgResponseTimeMSec?: number;
    crawlDurationMSec?: number;
    pagesVisited?: number;
    urlsAllowed?: number;
    statusCodes?: {
      [code: string]: number;
    };
  };
}

export interface CrawlRequestStatsFromServer {
  status: {
    avg_response_time_msec?: number;
    crawl_duration_msec?: number;
    pages_visited?: number;
    urls_allowed?: number;
    status_codes?: {
      [code: string]: number;
    };
  };
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

export type CrawlRequestWithDetailsFromServer = CrawlRequestFromServer & {
  type: CrawlType;
  crawl_config: CrawlConfigFromServer;
  stats: CrawlRequestStatsFromServer;
};

export type CrawlRequestWithDetails = CrawlRequest & {
  type: CrawlType;
  crawlConfig: CrawlConfig;
  stats: CrawlRequestStats | null;
};

export type CrawlEventStage = 'crawl' | 'process';

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

export const readableCrawlerStatuses: { [key in CrawlerStatus]: string } = {
  [CrawlerStatus.Pending]: i18n.translate(
    'xpack.enterpriseSearch.appSearch.crawler.crawlerStatusOptions.pending',
    { defaultMessage: 'Pending' }
  ),
  [CrawlerStatus.Suspended]: i18n.translate(
    'xpack.enterpriseSearch.appSearch.crawler.crawlerStatusOptions.suspended',
    { defaultMessage: 'Suspended' }
  ),
  [CrawlerStatus.Starting]: i18n.translate(
    'xpack.enterpriseSearch.appSearch.crawler.crawlerStatusOptions.starting',
    { defaultMessage: 'Starting' }
  ),
  [CrawlerStatus.Running]: i18n.translate(
    'xpack.enterpriseSearch.appSearch.crawler.crawlerStatusOptions.running',
    { defaultMessage: 'Running' }
  ),
  [CrawlerStatus.Suspending]: i18n.translate(
    'xpack.enterpriseSearch.appSearch.crawler.crawlerStatusOptions.suspending',
    { defaultMessage: 'Suspending' }
  ),
  [CrawlerStatus.Canceling]: i18n.translate(
    'xpack.enterpriseSearch.appSearch.crawler.crawlerStatusOptions.canceling',
    { defaultMessage: 'Canceling' }
  ),
  [CrawlerStatus.Success]: i18n.translate(
    'xpack.enterpriseSearch.appSearch.crawler.crawlerStatusOptions.success',
    { defaultMessage: 'Success' }
  ),
  [CrawlerStatus.Failed]: i18n.translate(
    'xpack.enterpriseSearch.appSearch.crawler.crawlerStatusOptions.failed',
    { defaultMessage: 'Failed' }
  ),
  [CrawlerStatus.Canceled]: i18n.translate(
    'xpack.enterpriseSearch.appSearch.crawler.crawlerStatusOptions.canceled',
    { defaultMessage: 'Canceled' }
  ),
  [CrawlerStatus.Skipped]: i18n.translate(
    'xpack.enterpriseSearch.appSearch.crawler.crawlerStatusOptions.skipped',
    { defaultMessage: 'Skipped' }
  ),
};

export const readableCrawlTypes: { [key in CrawlType]: string } = {
  [CrawlType.Full]: i18n.translate(
    'xpack.enterpriseSearch.appSearch.crawler.crawlTypeOptions.full',
    { defaultMessage: 'Full' }
  ),
  [CrawlType.Partial]: i18n.translate(
    'xpack.enterpriseSearch.appSearch.crawler.crawlTypeOptions.partial',
    { defaultMessage: 'Partial' }
  ),
};

export interface CrawlSchedule {
  frequency: number;
  unit: CrawlUnits;
}

// The BE uses a singular form of each unit
// See shared_togo/app/models/shared_togo/crawler/crawl_schedule.rb
export enum CrawlUnits {
  hours = 'hour',
  days = 'day',
  weeks = 'week',
  months = 'month',
}

export interface DomainConfigFromServer {
  id: string;
  name: string;
  seed_urls: string[];
  sitemap_urls: string[];
}

export interface DomainConfig {
  id: string;
  name: string;
  seedUrls: string[];
  sitemapUrls: string[];
}
