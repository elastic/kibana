/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AI_SEARCH_PLUGIN,
  ANALYTICS_PLUGIN,
  APP_SEARCH_PLUGIN,
  ENTERPRISE_SEARCH_CONTENT_PLUGIN,
  SEARCH_EXPERIENCES_PLUGIN,
  SEARCH_PRODUCT_NAME,
  VECTOR_SEARCH_PLUGIN,
  WORKPLACE_SEARCH_PLUGIN,
} from '../../../../common/constants';

/**
 * Generate a document title that generally follows our breadcrumb trails
 * https://github.com/elastic/kibana/blob/main/docs/development/core/public/kibana-plugin-core-public.chromedoctitle.md
 */

type Title = string[];

/**
 * Given an array of page titles, return a final formatted document title
 * @param pages - e.g., ['Curations', 'some Engine', 'App Search']
 * @returns - e.g., 'Curations - some Engine - App Search'
 */
export const generateTitle = (pages: Title) => pages.join(' - ');

/**
 * Product-specific helpers
 */

export const searchTitle = (page: Title = []) => generateTitle([...page, SEARCH_PRODUCT_NAME]);

export const analyticsTitle = (page: Title = []) => generateTitle([...page, ANALYTICS_PLUGIN.NAME]);

export const elasticsearchTitle = (page: Title = []) =>
  generateTitle([...page, 'Getting started with Elasticsearch']);

export const appSearchTitle = (page: Title = []) =>
  generateTitle([...page, APP_SEARCH_PLUGIN.NAME]);

export const workplaceSearchTitle = (page: Title = []) =>
  generateTitle([...page, WORKPLACE_SEARCH_PLUGIN.NAME]);

export const searchExperiencesTitle = (page: Title = []) =>
  generateTitle([...page, SEARCH_EXPERIENCES_PLUGIN.NAME]);

export const aiSearchTitle = (page: Title = []) => generateTitle([...page, AI_SEARCH_PLUGIN.NAME]);

export const vectorSearchTitle = (page: Title = []) =>
  generateTitle([...page, VECTOR_SEARCH_PLUGIN.NAME]);

export const enterpriseSearchContentTitle = (page: Title = []) =>
  generateTitle([...page, ENTERPRISE_SEARCH_CONTENT_PLUGIN.NAME]);
