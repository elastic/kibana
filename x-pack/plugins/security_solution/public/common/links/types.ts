/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/types';
import type { ILicense, LicenseType } from '@kbn/licensing-plugin/common/types';
import type { IconType } from '@elastic/eui';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import type { SecurityPageName } from '../../../common/constants';

/**
 * Permissions related parameters needed for the links to be filtered
 */
export interface LinksPermissions {
  capabilities: Capabilities;
  experimentalFeatures: Readonly<ExperimentalFeatures>;
  license?: ILicense;
}

export interface LinkCategory {
  label: string;
  linkIds: readonly SecurityPageName[];
}

export type LinkCategories = Readonly<LinkCategory[]>;

export interface LinkItem {
  /**
   * Capabilities strings (using object dot notation) to enable the link.
   *
   * The format of defining features supports OR and AND mechanism. To specify features in an OR fashion
   * they can be defined in a single level array like: [requiredFeature1, requiredFeature2]. If either of these features
   * is satisfied the link would be included. To require that the features be AND'd together a second level array
   * can be specified: [feature1, [feature2, feature3]] this would result in feature1 || (feature2 && feature3). To specify
   * features that all must be and'd together an example would be: [[feature1, feature2]], this would result in the boolean
   * operation feature1 && feature2.
   *
   * The final format is to specify a single feature, this would be like: features: feature1, which is the same as
   * features: [feature1]
   */
  capabilities?: string | Array<string | string[]>;
  /**
   * Categories to display in the navigation
   */
  categories?: LinkCategories;
  /**
   * The description of the link content
   */
  description?: string;
  /**
   * Experimental flag needed to enable the link
   */
  experimentalKey?: keyof ExperimentalFeatures;
  /**
   * Global navigation position number.
   * Define this property only if the link needs to be visible within
   * the Security section of the Kibana collapsible global navigation
   */
  globalNavPosition?: number;
  /**
   * Disables link in the global search. Defaults to false.
   */
  globalSearchDisabled?: boolean;
  /**
   * Keywords for the global search to search.
   */
  globalSearchKeywords?: string[];
  /**
   * Disables the timeline call to action on the bottom of the page. Defaults to false.
   */
  hideTimeline?: boolean;
  /**
   * Experimental flag needed to disable the link. Opposite of experimentalKey
   */
  hideWhenExperimentalKey?: keyof ExperimentalFeatures;
  /**
   * Link id. Refers to a SecurityPageName
   */
  id: SecurityPageName;
  /**
   * Displays the "Beta" badge. Defaults to false.
   */
  isBeta?: boolean;
  /**
   * Customize the "Beta" badge content.
   */
  betaOptions?: {
    text: string;
  };
  /**
   * Icon that is displayed on menu navigation landing page.
   * Only required for pages that are displayed inside a landing page.
   */
  landingIcon?: IconType;
  /**
   * Image that is displayed on menu navigation landing page.
   * Only required for pages that are displayed inside a landing page.
   */
  landingImage?: string;
  /**
   * Minimum license required to enable the link
   */
  licenseType?: LicenseType;
  /**
   * Nested links
   */
  links?: LinkItem[];
  /**
   * Link path relative to security root
   */
  path: string;
  /**
   * Disables link in the side navigation. Defaults to false.
   */
  sideNavDisabled?: boolean;
  /**
   * Disables the state query string in the URL. Defaults to false.
   */
  skipUrlState?: boolean;
  /**
   * Title of the link
   */
  title: string;
}

export type AppLinkItems = Readonly<LinkItem[]>;

export type LinkInfo = Omit<LinkItem, 'links'>;
export type NormalizedLink = LinkInfo & { parentId?: SecurityPageName };
export type NormalizedLinks = Partial<Record<SecurityPageName, NormalizedLink>>;
