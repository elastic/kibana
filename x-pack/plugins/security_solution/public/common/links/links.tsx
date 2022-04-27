/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppDeepLink, AppNavLinkStatus, Capabilities } from '@kbn/core/public';
import { LicenseType } from '@kbn/licensing-plugin/common/types';
import { get } from 'lodash';
import { ExperimentalFeatures } from '../../../common/experimental_features';
import { appLinks } from './structure';
import { LinkItem, Feature } from './types';
interface LinkProps {
  enableExperimental: ExperimentalFeatures;
  isBasic: boolean;
  capabilities?: Capabilities;
}

const createDeepLink = (link: LinkItem, linkProps?: LinkProps): AppDeepLink => ({
  ...(link.items && link.items.length ? { deepLinks: reduceDeepLinks(link.items, linkProps) } : {}),
  ...(link.icon != null ? { euiIconType: link.icon } : {}),
  ...(link.image != null ? { icon: link.image } : {}),
  id: link.id,
  ...(link.globalSearchKeywords != null ? { keywords: link.globalSearchKeywords } : {}),
  ...(link.globalNavEnabled != null
    ? { navLinkStatus: link.globalNavEnabled ? AppNavLinkStatus.visible : AppNavLinkStatus.hidden }
    : {}),
  ...(link.globalNavOrder != null ? { order: link.globalNavOrder } : {}),
  path: link.url,
  ...(link.globalSearchEnabled != null ? { searchable: link.globalSearchEnabled } : {}),
  title: link.label,
});

const hasFeaturesCapability = (
  features: Feature[] | undefined,
  capabilities: Capabilities
): boolean => {
  if (!features) {
    return true;
  }
  return features.some((featureKey) => get(capabilities, featureKey, false));
};

const reduceDeepLinks = (links: LinkItem[], linkProps?: LinkProps): AppDeepLink[] =>
  links.reduce((deepLinks: AppDeepLink[], link: LinkItem) => {
    if (
      linkProps != null &&
      ((linkProps.isBasic && link.isPremium) ||
        (link.hideWhenExperimentalKey != null &&
          linkProps.enableExperimental[link.hideWhenExperimentalKey]) ||
        (link.experimentalKey != null && !linkProps.enableExperimental[link.experimentalKey]) ||
        (linkProps.capabilities != null &&
          !hasFeaturesCapability(link.features, linkProps.capabilities)))
    ) {
      return deepLinks;
    }
    return [...deepLinks, createDeepLink(link, linkProps)];
  }, []);

export const getInitialDeepLinks = (): AppDeepLink[] => {
  return appLinks.map((link) => createDeepLink(link));
};

export const getDeepLinks = (
  enableExperimental: ExperimentalFeatures,
  licenseType?: LicenseType,
  capabilities?: Capabilities
): AppDeepLink[] => {
  const isBasic = licenseType === 'basic';
  return reduceDeepLinks(appLinks, { enableExperimental, isBasic, capabilities });
};
