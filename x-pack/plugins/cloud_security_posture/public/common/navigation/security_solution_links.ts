/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloudPosturePages } from './constants';
import type { CloudSecurityPosturePageId, CspPage } from './types';

interface BaseLinkItem {
  id: string;
  title: string;
  path: string;
  links?: BaseLinkItem[];
}

type SecuritySolutionLinkExtensions<TLinkItem extends BaseLinkItem> = Partial<
  Record<CloudSecurityPosturePageId, Partial<TLinkItem>>
>;

export const getSecuritySolutionLinks = <TLinkItem extends BaseLinkItem = BaseLinkItem>(
  cspPage: CspPage,
  extensions?: SecuritySolutionLinkExtensions<TLinkItem>
): TLinkItem =>
  ({
    id: cloudPosturePages[cspPage].id,
    title: cloudPosturePages[cspPage].name,
    path: cloudPosturePages[cspPage].path,
    ...(extensions?.[cloudPosturePages[cspPage].id] ?? {}),
  } as TLinkItem);

export const getSecuritySolutionRootLinks = <TLinkItem extends BaseLinkItem = BaseLinkItem>(
  extensions?: SecuritySolutionLinkExtensions<TLinkItem>
): TLinkItem => getSecuritySolutionLinks('findings', extensions);

export const getSecuritySolutionDashboardLinks = <TLinkItem extends BaseLinkItem = BaseLinkItem>(
  extensions?: SecuritySolutionLinkExtensions<TLinkItem>
): TLinkItem => getSecuritySolutionLinks('dashboard', extensions);

export const getSecuritySolutionManageLinks = <TLinkItem extends BaseLinkItem = BaseLinkItem>(
  extensions?: SecuritySolutionLinkExtensions<TLinkItem>
): TLinkItem => {
  const manageLinks = getSecuritySolutionLinks('benchmarks', extensions);
  manageLinks.links = [getSecuritySolutionLinks('rules', extensions)];
  return manageLinks;
};
