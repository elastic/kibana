/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Capabilities, PublicUiSettingsParams, UserProvidedValues } from '@kbn/core/types';
import { ILicense, LicenseType } from '@kbn/licensing-plugin/common/types';
import { IconType } from '@elastic/eui';
import { ExperimentalFeatures } from '../../../common/experimental_features';
import { SecurityPageName } from '../../../common/constants';

type UiSettings = Readonly<Record<string, PublicUiSettingsParams & UserProvidedValues>>;

/**
 * Permissions related parameters needed for the links to be filtered
 */
export interface LinksPermissions {
  capabilities: Capabilities;
  experimentalFeatures: Readonly<ExperimentalFeatures>;
  license?: ILicense;
  uiSettings: UiSettings;
}

export interface LinkItem {
  /**
   * The description of the link content
   */
  description?: string;
  /**
   * Experimental flag needed to enable the link
   */
  experimentalKey?: keyof ExperimentalFeatures;
  /**
   * Capabilities strings to enable the link.
   * Uses "or" conditional, only one capability needed to enable the link
   */
  capabilities?: string[];
  /**
   * Enables link in the global navigation. Defaults to false.
   */
  globalNavEnabled?: boolean;
  /**
   * Global navigation order number
   */
  globalNavOrder?: number;
  /**
   * Enables link in the global search. Defaults to true.
   */
  globalSearchEnabled?: boolean;
  /**
   * Keywords for the global search to search.
   */
  globalSearchKeywords?: string[];
  /**
   * Experimental flag needed to disable the link. Opposite of experimentalKey
   */
  hideWhenExperimentalKey?: keyof ExperimentalFeatures;
  /**
   * Link id. Refers to a SecurityPageName
   */
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
  /**
   * Minimum licence required to enable the link
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
   * Enables link in the side navigation. Defaults to false.
   */
  skipUrlState?: boolean; // defaults to false
  /**
   * Title of the link
   */
  title: string;
  /**
   * Callback to filter the link based in uiSettings (kibana advanced settings)
   * Return false to exclude the link
   */
  uiSettingsEnabled?: (uiSettings: UiSettings) => boolean;
}

export type AppLinkItems = Readonly<LinkItem[]>;

export type LinkInfo = Omit<LinkItem, 'links'>;
export type NormalizedLink = LinkInfo & { parentId?: SecurityPageName };
export type NormalizedLinks = Record<SecurityPageName, NormalizedLink>;
