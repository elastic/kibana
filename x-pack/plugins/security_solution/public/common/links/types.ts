/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Capabilities } from '@kbn/core/types';
import { ExperimentalFeatures } from '../../../common/experimental_features';
import { CASES_FEATURE_ID, SecurityPageName, SERVER_APP_ID } from '../../../common/constants';

export const FEATURE = {
  general: `${SERVER_APP_ID}.show`,
  casesRead: `${CASES_FEATURE_ID}.read_cases`,
  casesCrud: `${CASES_FEATURE_ID}.crud_cases`,
} as const;

export type Feature = typeof FEATURE[keyof typeof FEATURE];

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
  icon?: string;
  id: SecurityPageName;
  image?: string;
  isBeta?: boolean;
  isPremium?: boolean;
  links?: LinkItem[];
  path: string;
  skipUrlState?: boolean; // defaults to false
  title: string;
}

export interface NavLinkItem {
  description?: string;
  icon?: string;
  id: SecurityPageName;
  links?: NavLinkItem[];
  image?: string;
  path: string;
  title: string;
  skipUrlState?: boolean; // default to false
}

export interface LinkProps {
  enableExperimental: ExperimentalFeatures;
  isBasic: boolean;
  capabilities?: Capabilities;
}

export type LinkInfo = Omit<LinkItem, 'links'>;
export type NormalizedLink = LinkInfo & { parentId?: SecurityPageName };
export type NormalizedLinks = Record<SecurityPageName, NormalizedLink>;
