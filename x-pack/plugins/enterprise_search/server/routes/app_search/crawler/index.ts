/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../../../plugin';

import { registerCrawlRulesRoutes } from './crawl_rules';
import { registerCrawlerRoutes as registerBaseCrawlerRoutes } from './crawler';
import { registerEntryPointRoutes } from './entry_points';
import { registerSitemapRoutes } from './sitemaps';

export function registerCrawlerRoutes(routeDependencies: RouteDependencies) {
  registerEntryPointRoutes(routeDependencies);
  registerSitemapRoutes(routeDependencies);
  registerCrawlRulesRoutes(routeDependencies);
  registerBaseCrawlerRoutes(routeDependencies);
}
