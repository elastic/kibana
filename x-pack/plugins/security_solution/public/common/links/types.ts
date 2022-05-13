/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Capabilities, PublicUiSettingsParams, UserProvidedValues } from '@kbn/core/types';
import { ILicense, LicenseType } from '@kbn/licensing-plugin/common/types';
import { ExperimentalFeatures } from '../../../common/experimental_features';
import { SecurityPageName } from '../../../common/constants';

type UiSettings = Readonly<Record<string, PublicUiSettingsParams & UserProvidedValues>>;
export interface LinksPermissions {
  experimentalFeatures: Readonly<ExperimentalFeatures>;
  capabilities: Capabilities;
  uiSettings: UiSettings;
  license?: ILicense;
}

export interface LinkItem {
  description?: string;
  disabled?: boolean; // default false
  /**
   * Displays deep link when feature flag is enabled.
   */
  experimentalKey?: keyof ExperimentalFeatures;
  capabilities?: string[];
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
  licenseType?: LicenseType;
  links?: LinkItem[];
  path: string;
  skipUrlState?: boolean; // defaults to false
  title: string;
  uiSettingsEnabled?: (uiSettings: UiSettings) => boolean;
}

export type AppLinkItems = Readonly<LinkItem[]>;

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

export type LinkInfo = Omit<LinkItem, 'links'>;
export type NormalizedLink = LinkInfo & { parentId?: SecurityPageName };
export type NormalizedLinks = Record<SecurityPageName, NormalizedLink>;
