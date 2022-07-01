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
