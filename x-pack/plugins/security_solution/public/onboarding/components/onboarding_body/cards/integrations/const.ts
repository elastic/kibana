/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CategoryFacet } from '@kbn/fleet-plugin/public';
import type { Tab } from './types';

export const FLEET_URL_QUERY = 'onboardingLink';
export const SEARCH_FILTER_CATEGORIES: CategoryFacet[] = [];
export const SCROLL_ELEMENT_ID = 'integrations-scroll-container';
export const WITH_SEARCH_BOX_HEIGHT = '517px';
export const WITHOUT_SEARCH_BOX_HEIGHT = '462px';
export const LOADING_SKELETON_HEIGHT = 10; // 10 lines of text
export const INTEGRATION_TABS: Tab[] = [
  {
    id: 'recommended',
    label: 'Recommended',
    category: 'security',
    iconType: 'starFilled',
    showSearchTools: false,
  },
  {
    id: 'network',
    label: 'Network',
    category: 'security',
    subCategory: 'network_security',
  },
  {
    id: 'user',
    label: 'User',
    category: 'security',
    subCategory: 'iam',
  },
  {
    id: 'endpoint',
    label: 'Endpoint',
    category: 'security',
    subCategory: 'edr_xdr',
  },
  {
    id: 'cloud',
    label: 'Cloud',
    category: 'security',
    subCategory: 'cloudsecurity_cdr',
  },
  {
    id: 'threatIntel',
    label: 'Threat Intel',
    category: 'security',
    subCategory: 'threat_intel',
  },
  {
    id: 'all',
    label: 'All',
    category: '',
  },
];
export const DEFAULT_TAB = INTEGRATION_TABS[0];
