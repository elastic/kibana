/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { BehaviorSubject } from 'rxjs';
import type { SecurityPageName } from '../../../common/constants';
import { hasCapabilities } from '../lib/capabilities';
import type {
  AppLinkItems,
  LinkInfo,
  LinkItem,
  NormalizedLink,
  NormalizedLinks,
  LinksPermissions,
} from './types';

/**
 * App links updater, it stores the links recursive hierarchy and keeps
 * the value of the app links in sync with all application components.
 * It can be updated using `updateAppLinks`.
 */
const appLinksUpdater$ = new BehaviorSubject<AppLinkItems>([]);
export const appLinks$ = appLinksUpdater$.asObservable();

// stores a flatten normalized appLinkItems object for internal direct id access
const normalizedAppLinksUpdater$ = new BehaviorSubject<NormalizedLinks>({});

/**
 * Updates the internal app links applying the filter by permissions
 */
export const updateAppLinks = (
  appLinksToUpdate: AppLinkItems,
  linksPermissions: LinksPermissions
) => {
  const processedAppLinks = processAppLinks(appLinksToUpdate, linksPermissions);
  appLinksUpdater$.next(Object.freeze(processedAppLinks));
  normalizedAppLinksUpdater$.next(Object.freeze(getNormalizedLinks(processedAppLinks)));
};

/**
 * Hook to get the app links updated value
 */
export const useAppLinks = (): AppLinkItems =>
  useObservable(appLinksUpdater$, appLinksUpdater$.getValue());
/**
 * Hook to get the normalized app links updated value
 */
export const useNormalizedAppLinks = (): NormalizedLinks =>
  useObservable(normalizedAppLinksUpdater$, normalizedAppLinksUpdater$.getValue());

/**
 * Hook to check if a link exists in the application links,
 * It can be used to know if a link access is authorized.
 */
export const useLinkExists = (id: SecurityPageName): boolean => {
  const normalizedLinks = useNormalizedAppLinks();
  return useMemo(() => !!normalizedLinks[id], [normalizedLinks, id]);
};

export const useLinkInfo = (id: SecurityPageName): LinkInfo | undefined => {
  const normalizedLinks = useNormalizedAppLinks();
  return useMemo(() => {
    const normalizedLink = normalizedLinks[id];
    if (!normalizedLink) {
      return undefined;
    }
    // discards the parentId and creates the linkInfo copy.
    const { parentId, ...linkInfo } = normalizedLink;
    return linkInfo;
  }, [normalizedLinks, id]);
};

/**
 * Hook to check if a link exists in the application links,
 * It can be used to know if a link access is authorized.
 */
export const useLinkAuthorized = (id: SecurityPageName): boolean => {
  const linkInfo = useLinkInfo(id);
  return useMemo(() => linkInfo != null && !linkInfo.unauthorized, [linkInfo]);
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

export const getLinksWithHiddenTimeline = (): LinkInfo[] => {
  return Object.values(normalizedAppLinksUpdater$.getValue()).filter((link) => link.hideTimeline);
};

// Internal functions

/**
 * Creates the `NormalizedLinks` structure from a `LinkItem` array
 */
function getNormalizedLinks(
  currentLinks: AppLinkItems,
  parentId?: SecurityPageName
): NormalizedLinks {
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
}

const getNormalizedLink = (id: SecurityPageName): Readonly<NormalizedLink> | undefined =>
  normalizedAppLinksUpdater$.getValue()[id];

const processAppLinks = (appLinks: AppLinkItems, linksPermissions: LinksPermissions): LinkItem[] =>
  appLinks.reduce<LinkItem[]>((acc, { links, ...appLinkWithoutSublinks }) => {
    if (!isLinkExperimentalKeyAllowed(appLinkWithoutSublinks, linksPermissions)) {
      return acc;
    }

    if (
      !hasCapabilities(linksPermissions.capabilities, appLinkWithoutSublinks.capabilities) ||
      !isLinkLicenseAllowed(appLinkWithoutSublinks, linksPermissions)
    ) {
      if (linksPermissions.upselling.isPageUpsellable(appLinkWithoutSublinks.id)) {
        acc.push({ ...appLinkWithoutSublinks, unauthorized: true });
      }
      return acc; // not adding sub-links for links that are not authorized
    }

    const resultAppLink: LinkItem = appLinkWithoutSublinks;
    if (links) {
      const childrenLinks = processAppLinks(links, linksPermissions);
      if (childrenLinks.length > 0) {
        resultAppLink.links = childrenLinks;
      }
    }

    acc.push(resultAppLink);
    return acc;
  }, []);

const isLinkExperimentalKeyAllowed = (
  link: LinkItem,
  { experimentalFeatures }: LinksPermissions
) => {
  if (link.hideWhenExperimentalKey && experimentalFeatures[link.hideWhenExperimentalKey]) {
    return false;
  }

  if (link.experimentalKey && !experimentalFeatures[link.experimentalKey]) {
    return false;
  }
  return true;
};

const isLinkLicenseAllowed = (link: LinkItem, { license }: LinksPermissions) => {
  const linkLicenseType = link.licenseType ?? 'basic';
  if (license) {
    if (!license.hasAtLeast(linkLicenseType)) {
      return false;
    }
  } else if (linkLicenseType !== 'basic') {
    return false;
  }
  return true;
};
