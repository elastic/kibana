/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ICrawlerDomain,
  ICrawlerDomainFromServer,
  ICrawlerData,
  ICrawlerDataFromServer,
} from './types';

export function crawlerDomainServerToClient(payload: ICrawlerDomainFromServer): ICrawlerDomain {
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
  } = payload;

  const clientPayload: ICrawlerDomain = {
    id,
    url: name,
    documentCount,
    createdOn,
    crawlRules,
    sitemaps,
    entryPoints,
  };

  if (lastCrawl) {
    clientPayload.lastCrawl = lastCrawl;
  }

  if (defaultCrawlRule) {
    clientPayload.defaultCrawlRule = defaultCrawlRule;
  }

  return clientPayload;
}

export function crawlerDataServerToClient(payload: ICrawlerDataFromServer): ICrawlerData {
  const { domains } = payload;

  return {
    domains: domains.map((domain) => crawlerDomainServerToClient(domain)),
  };
}
