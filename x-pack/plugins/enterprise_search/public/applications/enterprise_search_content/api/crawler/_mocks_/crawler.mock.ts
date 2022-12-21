/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CRAWL_EVENT,
  CRAWL_EVENT_FROM_SERVER,
  CRAWL_REQUEST,
  CRAWL_REQUEST_FROM_SERVER,
} from './crawl_events.mock';
import { CRAWLER_DOMAIN, CRAWLER_DOMAIN_FROM_SERVER } from './crawler_domains.mock';

import { CrawlerData, CrawlerDataFromServer } from '../types';

export const CRAWLER_DATA: CrawlerData = {
  domains: [CRAWLER_DOMAIN],
  events: [CRAWL_EVENT],
  mostRecentCrawlRequest: CRAWL_REQUEST,
  userAgent: 'Elastic Crawler (0.0.1)',
};

export const CRAWLER_DATA_FROM_SERVER: CrawlerDataFromServer = {
  domains: [CRAWLER_DOMAIN_FROM_SERVER],
  events: [CRAWL_EVENT_FROM_SERVER],
  most_recent_crawl_request: CRAWL_REQUEST_FROM_SERVER,
  user_agent: 'Elastic Crawler (0.0.1)',
};
