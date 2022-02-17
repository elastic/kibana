/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../../plugin';

import { registerSearchRelevanceSuggestionsRoutes } from './adaptive_relevance';
import { registerAnalyticsRoutes } from './analytics';
import { registerApiLogsRoutes } from './api_logs';
import { registerCrawlerRoutes } from './crawler';
import { registerCrawlerCrawlRulesRoutes } from './crawler_crawl_rules';
import { registerCrawlerEntryPointRoutes } from './crawler_entry_points';
import { registerCrawlerSitemapRoutes } from './crawler_sitemaps';
import { registerCredentialsRoutes } from './credentials';
import { registerCurationsRoutes } from './curations';
import { registerDocumentsRoutes, registerDocumentRoutes } from './documents';
import { registerEnginesRoutes } from './engines';
import { registerOnboardingRoutes } from './onboarding';
import { registerResultSettingsRoutes } from './result_settings';
import { registerRoleMappingsRoutes } from './role_mappings';
import { registerSchemaRoutes } from './schema';
import { registerSearchRoutes } from './search';
import { registerSearchSettingsRoutes } from './search_settings';
import { registerSearchUIRoutes } from './search_ui';
import { registerSettingsRoutes } from './settings';
import { registerSourceEnginesRoutes } from './source_engines';
import { registerSynonymsRoutes } from './synonyms';

export const registerAppSearchRoutes = (dependencies: RouteDependencies) => {
  registerEnginesRoutes(dependencies);
  registerCredentialsRoutes(dependencies);
  registerSettingsRoutes(dependencies);
  registerAnalyticsRoutes(dependencies);
  registerDocumentsRoutes(dependencies);
  registerDocumentRoutes(dependencies);
  registerSchemaRoutes(dependencies);
  registerSearchRoutes(dependencies);
  registerSourceEnginesRoutes(dependencies);
  registerCurationsRoutes(dependencies);
  registerSynonymsRoutes(dependencies);
  registerSearchSettingsRoutes(dependencies);
  registerRoleMappingsRoutes(dependencies);
  registerSearchUIRoutes(dependencies);
  registerResultSettingsRoutes(dependencies);
  registerApiLogsRoutes(dependencies);
  registerOnboardingRoutes(dependencies);
  registerCrawlerRoutes(dependencies);
  registerCrawlerEntryPointRoutes(dependencies);
  registerCrawlerCrawlRulesRoutes(dependencies);
  registerCrawlerSitemapRoutes(dependencies);
  registerSearchRelevanceSuggestionsRoutes(dependencies);
};
