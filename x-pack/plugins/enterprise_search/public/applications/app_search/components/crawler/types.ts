/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum ECrawlerPolicies {
  Allow = 'allow',
  Deny = 'deny',
}

export enum ECrawlerRules {
  beginsWith = 'begins',
  endsWith = 'ends',
  contains = 'contains',
  regex = 'regex',
}

export interface ICrawlRule {
  id: string;
  policy: ECrawlerPolicies;
  rule: ECrawlerRules;
  pattern: string;
}

export interface IEntryPoint {
  id: string;
  value: string;
}

export interface ISitemap {
  id: string;
  url: string;
}

export interface ICrawlerDomain {
  createdOn: string;
  documentCount: number;
  id: string;
  lastCrawl?: string;
  url: string;
  crawlRules: ICrawlRule[];
  defaultCrawlRule?: ICrawlRule;
  entryPoints: IEntryPoint[];
  sitemaps: ISitemap[];
}

export interface ICrawlerDomainFromServer {
  id: string;
  name: string;
  created_on: string;
  last_visited_at?: string;
  document_count: number;
  crawl_rules: ICrawlRule[];
  default_crawl_rule?: ICrawlRule;
  entry_points: IEntryPoint[];
  sitemaps: ISitemap[];
}

export interface ICrawlerData {
  domains: ICrawlerDomain[];
}

export interface ICrawlerDataFromServer {
  domains: ICrawlerDomainFromServer[];
}
