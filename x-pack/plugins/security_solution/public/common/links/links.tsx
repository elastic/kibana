/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppDeepLink, AppNavLinkStatus, Capabilities } from '@kbn/core/public';
import { LicenseType } from '@kbn/licensing-plugin/common/types';
import { get } from 'lodash';
import { SecurityPageName } from '../../../common/constants';
import { ExperimentalFeatures } from '../../../common/experimental_features';
import { appLinks } from './structure';
import {
  Feature,
  LinkInfo,
  LinkItem,
  LinkProps,
  NavLinkItem,
  NormalizedLink,
  NormalizedLinks,
} from './types';

const createDeepLink = (link: LinkItem, linkProps?: LinkProps): AppDeepLink => ({
  id: link.id,
  path: link.path,
  title: link.title,
  ...(link.links && link.links.length
    ? {
        deepLinks: reduceLinks<AppDeepLink>({
          links: link.links,
          linkProps,
          formatFunction: createDeepLink,
        }),
      }
    : {}),
  ...(link.icon != null ? { euiIconType: link.icon } : {}),
  ...(link.image != null ? { icon: link.image } : {}),
  ...(link.globalSearchKeywords != null ? { keywords: link.globalSearchKeywords } : {}),
  ...(link.globalNavEnabled != null
    ? { navLinkStatus: link.globalNavEnabled ? AppNavLinkStatus.visible : AppNavLinkStatus.hidden }
    : {}),
  ...(link.globalNavOrder != null ? { order: link.globalNavOrder } : {}),
  ...(link.globalSearchEnabled != null ? { searchable: link.globalSearchEnabled } : {}),
});

const createNavLinkItem = (link: LinkItem, linkProps?: LinkProps): NavLinkItem => ({
  id: link.id,
  path: link.path,
  title: link.title,
  ...(link.description != null ? { description: link.description } : {}),
  ...(link.icon != null ? { icon: link.icon } : {}),
  ...(link.image != null ? { image: link.image } : {}),
  ...(link.links && link.links.length
    ? {
        links: reduceLinks<NavLinkItem>({
          links: link.links,
          linkProps,
          formatFunction: createNavLinkItem,
        }),
      }
    : {}),
  ...(link.skipUrlState != null ? { skipUrlState: link.skipUrlState } : {}),
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

export function reduceLinks<T>({
  links,
  linkProps,
  formatFunction,
}: {
  links: LinkItem[];
  linkProps?: LinkProps;
  formatFunction: (link: LinkItem, linkProps?: LinkProps) => T;
}): T[] {
  return links.reduce((deepLinks: T[], link: LinkItem) => {
    if (
      linkProps != null &&
      // exclude link when license is basic and link is premium
      ((linkProps.isBasic && link.isPremium) ||
        // exclude link when enableExperimental[hideWhenExperimentalKey] is enabled and link has hideWhenExperimentalKey
        (link.hideWhenExperimentalKey != null &&
          linkProps.enableExperimental[link.hideWhenExperimentalKey]) ||
        // exclude link when enableExperimental[experimentalKey] is disabled and link has experimentalKey
        (link.experimentalKey != null && !linkProps.enableExperimental[link.experimentalKey]) ||
        // exclude link when link is not part of enabled feature capabilities
        (linkProps.capabilities != null &&
          !hasFeaturesCapability(link.features, linkProps.capabilities)))
    ) {
      return deepLinks;
    }
    return [...deepLinks, formatFunction(link, linkProps)];
  }, []);
}

export const getInitialDeepLinks = (): AppDeepLink[] => {
  return appLinks.map((link) => createDeepLink(link));
};

export const getDeepLinks = (
  enableExperimental: ExperimentalFeatures,
  licenseType?: LicenseType,
  capabilities?: Capabilities
): AppDeepLink[] => {
  const isBasic = licenseType === 'basic';
  return reduceLinks<AppDeepLink>({
    links: appLinks,
    linkProps: { enableExperimental, isBasic, capabilities },
    formatFunction: createDeepLink,
  });
};

export const getNavLinkItems = (
  enableExperimental: ExperimentalFeatures,
  licenseType?: LicenseType,
  capabilities?: Capabilities
): NavLinkItem[] => {
  const isBasic = licenseType === 'basic';
  return reduceLinks<NavLinkItem>({
    links: appLinks,
    linkProps: { enableExperimental, isBasic, capabilities },
    formatFunction: createNavLinkItem,
  });
};

/**
 * Recursive function to create the `NormalizedLinks` structure from a `LinkItem` array parameter
 */
const getNormalizedLinks = (
  currentLinks: LinkItem[],
  parentId?: SecurityPageName
): NormalizedLinks => {
  const result = currentLinks.reduce<Partial<NormalizedLinks>>(
    (normalized, { links, ...currentLink }) => {
      normalized[currentLink.id] = {
        ...currentLink,
        parentId,
      };
      if (links && links.length > 0) {
        Object.assign(normalized, getNormalizedLinks(links, currentLink.id));
      }
      return normalized;
    },
    {}
  );
  return result as NormalizedLinks;
};

/**
 * Normalized indexed version of the global `links` array, referencing the parent by id, instead of having nested links children
 */
const normalizedLinks: Readonly<NormalizedLinks> = Object.freeze(getNormalizedLinks(appLinks));

/**
 * Returns the `NormalizedLink` from a link id parameter.
 * The object reference is frozen to make sure it is not mutated by the caller.
 */
const getNormalizedLink = (id: SecurityPageName): Readonly<NormalizedLink> =>
  Object.freeze(normalizedLinks[id]);

/**
 * Returns the `LinkInfo` from a link id parameter
 */
export const getLinkInfo = (id: SecurityPageName): LinkInfo => {
  // discards the parentId and creates the linkInfo copy.
  const { parentId, ...linkInfo } = getNormalizedLink(id);
  return linkInfo;
};

/**
 * Returns the `LinkInfo` of all the ancestors to the parameter id link, also included.
 */
export const getAncestorLinksInfo = (id: SecurityPageName): LinkInfo[] => {
  const ancestors: LinkInfo[] = [];
  let currentId: SecurityPageName | undefined = id;
  while (currentId) {
    const { parentId, ...linkInfo } = getNormalizedLink(currentId);
    ancestors.push(linkInfo);
    currentId = parentId;
  }
  return ancestors.reverse();
};

/**
 * Returns `true` if the links needs to carry the application state in the url.
 * Defaults to `true` if the `skipUrlState` property of the `LinkItem` is `undefined`.
 */
export const needsUrlState = (id: SecurityPageName): boolean => {
  return !getNormalizedLink(id).skipUrlState;
};
