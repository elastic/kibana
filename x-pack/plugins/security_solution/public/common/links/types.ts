/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Capabilities } from '@kbn/core/types';
import { LicenseType } from '@kbn/licensing-plugin/common/types';
import { IconType } from '@elastic/eui';
import { LicenseService } from '../../../common/license';
import { ExperimentalFeatures } from '../../../common/experimental_features';
import { CASES_FEATURE_ID, SecurityPageName, SERVER_APP_ID } from '../../../common/constants';

export const FEATURE = {
  general: `${SERVER_APP_ID}.show`,
  casesRead: `${CASES_FEATURE_ID}.read_cases`,
  casesCrud: `${CASES_FEATURE_ID}.crud_cases`,
};

export type Feature = Readonly<typeof FEATURE[keyof typeof FEATURE]>;

export interface UserPermissions {
  enableExperimental: ExperimentalFeatures;
  license?: LicenseService;
  capabilities?: Capabilities;
}

export interface LinkItem {
  description?: string;
  disabled?: boolean; // default false
  /**
   * Displays deep link when feature flag is enabled.
   */
  experimentalKey?: keyof ExperimentalFeatures;
  features?: Feature[];
  /**
   * Hides deep link when feature flag is enabled.
   */
  globalNavEnabled?: boolean; // default false
  globalNavOrder?: number;
  globalSearchEnabled?: boolean;
  globalSearchKeywords?: string[];
  hideWhenExperimentalKey?: keyof ExperimentalFeatures;
  id: SecurityPageName;
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
  isBeta?: boolean;
  licenseType?: LicenseType;
  links?: LinkItem[];
  path: string;
  skipUrlState?: boolean; // defaults to false
  hideTimeline?: boolean; // defaults to false
  title: string;
}

export interface NavLinkItem {
  description?: string;
  icon?: IconType;
  id: SecurityPageName;
  links?: NavLinkItem[];
  image?: string;
  path: string;
  title: string;
  skipUrlState?: boolean; // default to false
}

export type LinkInfo = Omit<LinkItem, 'links'>;
export type NormalizedLink = LinkInfo & { parentId?: SecurityPageName };
export type NormalizedLinks = Record<SecurityPageName, NormalizedLink>;
