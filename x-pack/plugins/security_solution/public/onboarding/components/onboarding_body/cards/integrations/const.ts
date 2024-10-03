/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CategoryFacet } from '@kbn/fleet-plugin/public';
import type { Tab } from './types';

export const ADD_AGENT_PATH = `/agents`;
export const AGENT_INDEX = `logs-elastic_agent*`;
export const AGENTLESS_LEARN_MORE_LINK = null; // Link to be confirmed.
export const CARD_DESCRIPTION_LINE_CLAMP = 3; // 3 lines of text
export const CARD_TITLE_LINE_CLAMP = 1; // 1 line of text
export const FLEET_APP_ID = `fleet`;
export const INTEGRATION_APP_ID = `integrations`;
export const LOADING_SKELETON_HEIGHT = 10; // 10 lines of text
export const MAX_CARD_HEIGHT = 127; // px
export const ONBOARDING_APP_ID = 'onboardingAppId';
export const ONBOARDING_LINK = 'onboardingLink';
export const SCROLL_ELEMENT_ID = 'integrations-scroll-container';
export const SEARCH_FILTER_CATEGORIES: CategoryFacet[] = [];
export const WITH_SEARCH_BOX_HEIGHT = '517px';
export const WITHOUT_SEARCH_BOX_HEIGHT = '462px';
export const INTEGRATION_TABS: Tab[] = [
  {
    category: 'security',
    iconType: 'starFilled',
    id: 'recommended',
    label: 'Recommended',
    overflow: 'hidden',
    showSearchTools: false,
  },
  {
    category: 'security',
    id: 'network',
    label: 'Network',
    subCategory: 'network_security',
  },
  {
    category: 'security',
    id: 'user',
    label: 'User',
    subCategory: 'iam',
  },
  {
    category: 'security',
    id: 'endpoint',
    label: 'Endpoint',
    subCategory: 'edr_xdr',
  },
  {
    category: 'security',
    id: 'cloud',
    label: 'Cloud',
    subCategory: 'cloudsecurity_cdr',
  },
  {
    category: 'security',
    id: 'threatIntel',
    label: 'Threat Intel',
    subCategory: 'threat_intel',
  },
  {
    category: '',
    id: 'all',
    label: 'All',
  },
];
export const DEFAULT_TAB = INTEGRATION_TABS[0];
