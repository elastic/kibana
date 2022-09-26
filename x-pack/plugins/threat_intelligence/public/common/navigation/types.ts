/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * All the names for the threat intelligence pages.
 *
 * Example to add more names:
 *   export type TIPage = 'indicators' | 'feed';
 */
export type TIPage = 'indicators';

/**
 * All the IDs for the threat intelligence pages.
 * This needs to match the threat intelligence page entries in SecurityPageName` (x-pack/plugins/security_solution/common/constants.ts).
 *
 * Example to add more IDs:
 *   export type TIPageId = 'threat_intelligence-indicators' | 'threat_intelligence-feed';
 */
export type TIPageId = 'threat_intelligence-indicators';

/**
 * A record of all the properties that will be used to build deeplinks, links and navtabs objects.
 */
export interface TIPageProperties {
  id: TIPageId;
  readonly oldNavigationName: string; // delete when the old navigation is removed
  readonly newNavigationName: string; // rename to name when the old navigation is removed
  readonly path: string;
  readonly disabled: boolean;
  readonly description: string;
  readonly globalSearchKeywords: string[];
  readonly keywords: string[];
}
