/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useAppLinks } from '../../links';
import type { SecurityPageName } from '../../../app/types';
import type { NavLinkItem } from './types';
import type { AppLinkItems } from '../../links/types';

export const useAppNavLinks = (): NavLinkItem[] => {
  const appLinks = useAppLinks();
  const navLinks = useMemo(() => formatNavLinkItems(appLinks), [appLinks]);
  return navLinks;
};

export const useAppRootNavLink = (linkId: SecurityPageName): NavLinkItem | undefined => {
  return useAppNavLinks().find(({ id }) => id === linkId);
};

const formatNavLinkItems = (appLinks: AppLinkItems): NavLinkItem[] =>
  appLinks.map((link) => ({
    id: link.id,
    title: link.title,
    ...(link.categories != null ? { categories: link.categories } : {}),
    ...(link.description != null ? { description: link.description } : {}),
    ...(link.sideNavDisabled === true ? { disabled: true } : {}),
    ...(link.landingIcon != null ? { icon: link.landingIcon } : {}),
    ...(link.landingImage != null ? { image: link.landingImage } : {}),
    ...(link.skipUrlState != null ? { skipUrlState: link.skipUrlState } : {}),
    ...(link.isBeta != null ? { isBeta: link.isBeta } : {}),
    ...(link.betaOptions != null ? { betaOptions: link.betaOptions } : {}),
    ...(link.links && link.links.length
      ? {
          links: formatNavLinkItems(link.links),
        }
      : {}),
  }));
