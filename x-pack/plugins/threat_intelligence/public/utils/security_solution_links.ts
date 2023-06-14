/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIPage, TIPageId } from '../types';
import { threatIntelligencePages } from '../constants/navigation';

/**
 * Properties used in the Security Solution plugin to add links to the navigation.
 * The properties come from LinkItem (x-pack/plugins/security_solution/public/common/links/types.ts).
 *
 * If we want to control more from within the Threat Intelligence plugin, we can keep growing this interface.
 */
interface TILinkItem<TId extends string = TIPageId> {
  /**
   * Keywords for the global search to search.
   */
  globalSearchKeywords?: string[];
  /**
   * Link id. Refers to a SecurityPageName
   */
  id: TId;
  /**
   * Link path relative to security root.
   */
  path: string;
  /**
   * The description of the link content.
   */
  description: string;
  /**
   * Title of the link
   */
  title: string;
}

/**
 * Gets the threat intelligence properties of a TI page for navigation in the security solution.
 * @param threatIntelligencePage the name of the threat intelligence page.
 * @returns a {@link TILinkItem}
 */
export const getSecuritySolutionLink = <TId extends string = TIPageId>(
  threatIntelligencePage: TIPage
): TILinkItem<TId> => ({
  id: threatIntelligencePages[threatIntelligencePage].id as TId,
  title: threatIntelligencePages[threatIntelligencePage].newNavigationName,
  path: threatIntelligencePages[threatIntelligencePage].path,
  description: threatIntelligencePages[threatIntelligencePage].description,
  globalSearchKeywords: threatIntelligencePages[threatIntelligencePage].globalSearchKeywords,
});
