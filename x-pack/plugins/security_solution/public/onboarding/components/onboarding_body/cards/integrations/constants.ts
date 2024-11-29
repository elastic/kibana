/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CategoryFacet } from '@kbn/fleet-plugin/public';
import { INTEGRATION_TABS } from './integration_tabs_configs';
import type { Tab } from './types';

export const ADD_AGENT_PATH = `/agents`;
export const AGENT_INDEX = `logs-elastic_agent*`;
export const CARD_DESCRIPTION_LINE_CLAMP = 3; // 3 lines of text
export const CARD_TITLE_LINE_CLAMP = 1; // 1 line of text
export const DEFAULT_TAB: Tab = INTEGRATION_TABS[0];
export const FLEET_APP_ID = `fleet`;
export const INTEGRATION_APP_ID = `integrations`;
export const LOADING_SKELETON_TEXT_LINES = 10; // 10 lines of text
export const MAX_CARD_HEIGHT_IN_PX = 127; // px
export const ONBOARDING_APP_ID = 'onboardingAppId';
export const ONBOARDING_LINK = 'onboardingLink';
export const SCROLL_ELEMENT_ID = 'integrations-scroll-container';
export const SEARCH_FILTER_CATEGORIES: CategoryFacet[] = [];
export const WITH_SEARCH_BOX_HEIGHT = '568px';
export const WITHOUT_SEARCH_BOX_HEIGHT = '513px';
export const TELEMETRY_MANAGE_INTEGRATIONS = `manage_integrations`;
export const TELEMETRY_ENDPOINT_LEARN_MORE = `endpoint_learn_more`;
export const TELEMETRY_AGENTLESS_LEARN_MORE = `agentless_learn_more`;
export const TELEMETRY_AGENT_REQUIRED = `agent_required`;
export const TELEMETRY_INTEGRATION_CARD = `card`;
export const TELEMETRY_INTEGRATION_TAB = `tab`;
