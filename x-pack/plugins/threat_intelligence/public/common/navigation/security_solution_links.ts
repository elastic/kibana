/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIPage, TIPageId } from './types';
import { threatIntelligencePages } from './constants';

/**
 * Properties used in the Security Solution plugin to enable deep linking.
 * The properties come from SecuritySolutionDeepLink (x-pack/plugins/security_solution/public/app/deep_links/index.ts).
 *
 * If we want to control more from within the Threat Intelligence plugin, we can keep growing this interface.
 */
interface TIDeepLink<TId extends string = TIPageId> {
  /**
   * Optional keywords to match with in deep links search. Omit if this part of the hierarchy does not have a page URL.
   */
  keywords?: string[];
  /**
   * Identifier to represent this sublink, should be unique for this application.
   */
  id: TId;
  /**
   *  URL path to access this link, relative to the application's appRoute.
   */
  path: string;
  /**
   * Title to label represent this deep link.
   **/
  title: string;
}

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
 * Properties used in the Security Solution plugin to add links to the old navigation.
 * The properties comes from NavTab (x-pack/plugins/security_solution/public/common/components/navigation/types.ts).
 *
 * If we want to control more from within the Threat Intelligence plugin, we can keep growing this interface.
 */
interface TINavTab<TId extends string = TIPageId> {
  /**
   * Nav tab id.
   */
  id: TId;
  /**
   * Name displayed in the sidenav.
   */
  name: string;
  /**
   * Page's path to navigate to when clicked.
   */
  href: string;
  /**
   * Disables nav tab.
   */
  disabled: boolean;
}

/**
 * Gets the threat intelligence properties of a TI page for deep linking in the security solution.
 * @param threatIntelligencePage the name of the threat intelligence page.
 * @returns a {@link TIDeepLink}
 */
export const getSecuritySolutionDeepLink = <TId extends string = TIPageId>(
  threatIntelligencePage: TIPage
): TIDeepLink<TId> => ({
  id: threatIntelligencePages[threatIntelligencePage].id as TId,
  title: threatIntelligencePages[threatIntelligencePage].newNavigationName,
  path: threatIntelligencePages[threatIntelligencePage].path,
  keywords: threatIntelligencePages[threatIntelligencePage].keywords,
});

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

/**
 * Gets the threat intelligence properties of a TI page for navigation in the old security solution navigation.
 * @param threatIntelligencePage the name of the threat intelligence page.
 * @param basePath the base path for links.
 * @returns a {@link TINavTab}
 */
export const getSecuritySolutionNavTab = <TId extends string = TIPageId>(
  threatIntelligencePage: TIPage,
  basePath: string
): TINavTab<TId> => ({
  id: threatIntelligencePages[threatIntelligencePage].id as TId,
  name: threatIntelligencePages[threatIntelligencePage].oldNavigationName,
  href: `${basePath}${threatIntelligencePages[threatIntelligencePage].path}`,
  disabled: threatIntelligencePages[threatIntelligencePage].disabled,
});
