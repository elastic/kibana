/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum CrawlerPolicies {
  Allow = 'allow',
  Deny = 'deny',
}

export enum CrawlerRules {
  beginsWith = 'begins',
  endsWith = 'ends',
  contains = 'contains',
  regex = 'regex',
}

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
}

export interface CrawlerData {
  domains: CrawlerDomain[];
}

export interface CrawlerDataFromServer {
  domains: CrawlerDomainFromServer[];
}
