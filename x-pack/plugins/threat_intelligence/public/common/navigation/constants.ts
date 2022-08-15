/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIPage, TIPageProperties } from './types';
import { INDICATORS, INTELLIGENCE, DESCRIPTION } from './translations';

/**
 * Base path for all the pages within the Threat Intelligence plugin.
 */
export const THREAT_INTELLIGENCE_BASE_PATH = '/threat_intelligence';

/**
 * All the links and navigation properties to be used in the Security Solution plugin.
 */
export const threatIntelligencePages: Record<TIPage, TIPageProperties> = {
  indicators: {
    oldNavigationName: INDICATORS,
    newNavigationName: INTELLIGENCE,
    path: `${THREAT_INTELLIGENCE_BASE_PATH}/indicators`,
    id: 'threat_intelligence-indicators',
    description: DESCRIPTION,
    globalSearchKeywords: [INTELLIGENCE],
    keywords: [INTELLIGENCE],
    disabled: false,
  },
};
