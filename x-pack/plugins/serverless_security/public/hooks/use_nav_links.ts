/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { SecurityPageName } from '@kbn/security-solution-plugin/common';
import type { NavigationLink } from '@kbn/security-solution-plugin/public/common/links/types';
import { useKibana } from '../services';

export const useNavLinks = () => {
  const { securitySolution } = useKibana().services;
  const { getNavLinks$ } = securitySolution;
  const navLinks$ = useMemo(() => getNavLinks$(), [getNavLinks$]);
  return useObservable(navLinks$, []);
};

export const useRootNavLink = (linkId: SecurityPageName): NavigationLink | undefined => {
  return useNavLinks().find(({ id }) => id === linkId);
};

export const findLinkWithId = (
  linkId: SecurityPageName,
  navLinks: NavigationLink[]
): NavigationLink | undefined => {
  for (const navLink of navLinks) {
    if (navLink.id === linkId) {
      return navLink;
    }
    if (navLink.links?.length) {
      const found = findLinkWithId(linkId, navLink.links);
      if (found) {
        return found;
      }
    }
  }
};

export const useFindNavLink = (): ((linkId: SecurityPageName) => NavigationLink | undefined) => {
  const navLinks = useNavLinks();

  const findNavLink = useCallback(
    (linkId: SecurityPageName): NavigationLink | undefined => findLinkWithId(linkId, navLinks),
    [navLinks]
  );

  return findNavLink;
};
