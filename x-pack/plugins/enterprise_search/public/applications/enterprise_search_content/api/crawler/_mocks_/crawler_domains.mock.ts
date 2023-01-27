/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta } from '../../../../../../common/types';

import {
  CrawlerDomain,
  CrawlerPolicies,
  CrawlRule,
  CrawlerRules,
  EntryPoint,
  Sitemap,
  CrawlerDomainFromServer,
  DomainConfigFromServer,
  DomainConfig,
  CrawlerDomainsWithMeta,
  CrawlerDomainsWithMetaFromServer,
} from '../types';

export const CRAWL_RULE: CrawlRule = {
  id: 'crawl-rule-1',
  pattern: 'elasticsearch',
  policy: CrawlerPolicies.allow,
  rule: CrawlerRules.contains,
};

export const ENTRY_POINT: EntryPoint = {
  id: 'entry-point-1',
  value: '/guide',
};

export const SITEMAP: Sitemap = {
  id: 'sitemap-1',
  url: '/sitemap.txt',
};

export const META: Meta = {
  page: {
    current: 1,
    size: 10,
    total_pages: 1,
    total_results: 8,
  },
};

// Server

export const CRAWLER_DOMAIN_CONFIG_FROM_SERVER: DomainConfigFromServer = {
  id: 'crawler-domain-config-1',
  name: 'https://www.elastic.co',
  seed_urls: ['https://www.elastic.co/guide', 'https://www.elastic.co/blogs'],
  sitemap_urls: ['https://www.elastic.co/sitemap.txt'],
};

export const CRAWLER_DOMAIN_FROM_SERVER: CrawlerDomainFromServer = {
  auth: {
    type: 'basic',
    username: 'username',
    password: 'password',
  },
  available_deduplication_fields: ['title', 'url'],
  crawl_rules: [CRAWL_RULE],
  created_on: '1657234422',
  deduplication_enabled: true,
  deduplication_fields: ['url'],
  document_count: 400,
  entry_points: [ENTRY_POINT],
  extraction_rules: [],
  id: '123abc',
  name: 'https://www.elastic.co',
  sitemaps: [SITEMAP],
};

export const CRAWLER_DOMAINS_WITH_META_FROM_SERVER: CrawlerDomainsWithMetaFromServer = {
  meta: META,
  results: [CRAWLER_DOMAIN_FROM_SERVER],
};

// Client

export const CRAWLER_DOMAIN_CONFIG: DomainConfig = {
  id: 'crawler-domain-config-1',
  name: 'https://www.elastic.co',
  seedUrls: ['https://www.elastic.co/guide', 'https://www.elastic.co/blogs'],
  sitemapUrls: ['https://www.elastic.co/sitemap.txt'],
};

export const CRAWLER_DOMAIN: CrawlerDomain = {
  auth: {
    type: 'basic',
    username: 'username',
    password: 'password',
  },
  availableDeduplicationFields: ['title', 'url'],
  crawlRules: [CRAWL_RULE],
  createdOn: '1657234422',
  deduplicationEnabled: true,
  deduplicationFields: ['url'],
  documentCount: 400,
  entryPoints: [ENTRY_POINT],
  extractionRules: [],
  id: '123abc',
  sitemaps: [SITEMAP],
  url: 'https://www.elastic.co',
};

export const CRAWLER_DOMAINS_WITH_META: CrawlerDomainsWithMeta = {
  domains: [CRAWLER_DOMAIN],
  meta: META,
};
