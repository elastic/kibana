/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CrawlerDomain,
  CrawlerDomainFromServer,
  CrawlerDomains,
  CrawlerDomainsFromServer,
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
