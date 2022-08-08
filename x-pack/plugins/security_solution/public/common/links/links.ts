/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/public';
import { get, isArray } from 'lodash';
import { useEffect, useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import type { SecurityPageName } from '../../../common/constants';
import type {
  AppLinkItems,
  LinkInfo,
  LinkItem,
  NormalizedLink,
  NormalizedLinks,
  LinksPermissions,
} from './types';

/**
 * App links updater, it keeps the value of the app links in sync with all application.
 * It can be updated using `updateAppLinks` or `excludeAppLink`
 * Read it using `subscribeAppLinks` or `useAppLinks` hook.
 */
const appLinksUpdater$ = new BehaviorSubject<{
  links: AppLinkItems;
  normalizedLinks: NormalizedLinks;
}>({
  links: [], // stores the appLinkItems recursive hierarchy
  normalizedLinks: {}, // stores a flatten normalized object for direct id access
});

const getAppLinksValue = (): AppLinkItems => appLinksUpdater$.getValue().links;
const getNormalizedLinksValue = (): NormalizedLinks => appLinksUpdater$.getValue().normalizedLinks;

/**
 * Subscribes to the updater to get the app links updates
 */
export const subscribeAppLinks = (onChange: (links: AppLinkItems) => void) =>
  appLinksUpdater$.subscribe(({ links }) => onChange(links));

/**
 * Hook to get the app links updated value
 */
export const useAppLinks = (): AppLinkItems => {
  const [appLinks, setAppLinks] = useState(getAppLinksValue);

  useEffect(() => {
    const linksSubscription = subscribeAppLinks((newAppLinks) => {
      setAppLinks(newAppLinks);
    });
    return () => linksSubscription.unsubscribe();
  }, []);

  return appLinks;
};

/**
 * Hook to check if a link exists in the application links,
 * It can be used to know if a link access is authorized.
 */
export const useLinkExists = (id: SecurityPageName): boolean => {
  const [linkExists, setLinkExists] = useState(!!getNormalizedLink(id));

  useEffect(() => {
    const linksSubscription = subscribeAppLinks(() => {
      setLinkExists(!!getNormalizedLink(id));
    });
    return () => linksSubscription.unsubscribe();
  }, [id]);

  return linkExists;
};

/**
 * Updates the app links applying the filter by permissions
 */
export const updateAppLinks = (
  appLinksToUpdate: AppLinkItems,
  linksPermissions: LinksPermissions
) => {
  const filteredAppLinks = getFilteredAppLinks(appLinksToUpdate, linksPermissions);
  appLinksUpdater$.next({
    links: Object.freeze(filteredAppLinks),
    normalizedLinks: Object.freeze(getNormalizedLinks(filteredAppLinks)),
  });
};

/**
 * Returns the `LinkInfo` from a link id parameter
 */
export const getLinkInfo = (id: SecurityPageName): LinkInfo | undefined => {
  const normalizedLink = getNormalizedLink(id);
  if (!normalizedLink) {
    return undefined;
  }
  // discards the parentId and creates the linkInfo copy.
  const { parentId, ...linkInfo } = normalizedLink;
  return linkInfo;
};

/**
 * Returns the `LinkInfo` of all the ancestors to the parameter id link, also included.
 */
export const getAncestorLinksInfo = (id: SecurityPageName): LinkInfo[] => {
  const ancestors: LinkInfo[] = [];
  let currentId: SecurityPageName | undefined = id;
  while (currentId) {
    const normalizedLink = getNormalizedLink(currentId);
    if (normalizedLink) {
      const { parentId, ...linkInfo } = normalizedLink;
      ancestors.push(linkInfo);
      currentId = parentId;
    } else {
      currentId = undefined;
    }
  }
  return ancestors.reverse();
};

/**
 * Returns `true` if the links needs to carry the application state in the url.
 * Defaults to `true` if the `skipUrlState` property of the `LinkItem` is `undefined`.
 */
export const needsUrlState = (id: SecurityPageName): boolean => {
  return !getNormalizedLink(id)?.skipUrlState;
};

// Internal functions

/**
 * Creates the `NormalizedLinks` structure from a `LinkItem` array
 */
const getNormalizedLinks = (
  currentLinks: AppLinkItems,
  parentId?: SecurityPageName
): NormalizedLinks => {
  return currentLinks.reduce<NormalizedLinks>((normalized, { links, ...currentLink }) => {
    normalized[currentLink.id] = {
      ...currentLink,
      parentId,
    };
    if (links && links.length > 0) {
      Object.assign(normalized, getNormalizedLinks(links, currentLink.id));
    }
    return normalized;
  }, {});
};

const getNormalizedLink = (id: SecurityPageName): Readonly<NormalizedLink> | undefined =>
  getNormalizedLinksValue()[id];

const getFilteredAppLinks = (
  appLinkToFilter: AppLinkItems,
  linksPermissions: LinksPermissions
): LinkItem[] =>
  appLinkToFilter.reduce<LinkItem[]>((acc, { links, ...appLink }) => {
    if (!isLinkAllowed(appLink, linksPermissions)) {
      return acc;
    }
    if (links) {
      const childrenLinks = getFilteredAppLinks(links, linksPermissions);
      if (childrenLinks.length > 0) {
        acc.push({ ...appLink, links: childrenLinks });
      } else {
        acc.push(appLink);
      }
    } else {
      acc.push(appLink);
    }
    return acc;
  }, []);

/**
 * The format of defining features supports OR and AND mechanism. To specify features in an OR fashion
 * they can be defined in a single level array like: [requiredFeature1, requiredFeature2]. If either of these features
 * is satisfied the links would be included. To require that the features be AND'd together a second level array
 * can be specified: [feature1, [feature2, feature3]] this would result in feature1 || (feature2 && feature3).
 *
 * The final format is to specify a single feature, this would be like: features: feature1, which is the same as
 * features: [feature1]
 */
type LinkCapabilities = string | Array<string | string[]>;

// It checks if the user has at least one of the link capabilities needed
export const hasCapabilities = <T>(
  linkCapabilities: LinkCapabilities,
  userCapabilities: Capabilities
): boolean => {
  if (!isArray(linkCapabilities)) {
    return !!get(userCapabilities, linkCapabilities, false);
  } else {
    return linkCapabilities.some((linkCapabilityKeyOr) => {
      if (isArray(linkCapabilityKeyOr)) {
        return linkCapabilityKeyOr.every((linkCapabilityKeyAnd) =>
          get(userCapabilities, linkCapabilityKeyAnd, false)
        );
      }
      return get(userCapabilities, linkCapabilityKeyOr, false);
    });
  }
};

const isLinkAllowed = (
  link: LinkItem,
  { license, experimentalFeatures, capabilities }: LinksPermissions
) => {
  const linkLicenseType = link.licenseType ?? 'basic';
  if (license) {
    if (!license.hasAtLeast(linkLicenseType)) {
      return false;
    }
  } else if (linkLicenseType !== 'basic') {
    return false;
  }
  if (link.hideWhenExperimentalKey && experimentalFeatures[link.hideWhenExperimentalKey]) {
    return false;
  }
  if (link.experimentalKey && !experimentalFeatures[link.experimentalKey]) {
    return false;
  }
  if (link.capabilities && !hasCapabilities(link.capabilities, capabilities)) {
    return false;
  }
  return true;
};

export const getLinksWithHiddenTimeline = (): LinkInfo[] => {
  return Object.values(getNormalizedLinksValue()).filter((link) => link.hideTimeline);
};
