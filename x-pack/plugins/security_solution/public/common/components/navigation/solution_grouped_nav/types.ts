/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { SecurityPageName } from '../../../../app/types';
import type { LinkCategories } from '../../../links/types';

export interface DefaultSideNavItem {
  id: SecurityPageName;
  label: string;
  href: string;
  onClick?: React.MouseEventHandler;
  description?: string;
  items?: DefaultSideNavItem[];
  categories?: LinkCategories;
  isBeta?: boolean;
  betaOptions?: {
    text: string;
  };
}

export interface CustomSideNavItem {
  id: string;
  render: (isSelected: boolean) => React.ReactNode;
}

export type SideNavItem = DefaultSideNavItem | CustomSideNavItem;

export const isCustomItem = (navItem: SideNavItem): navItem is CustomSideNavItem =>
  'render' in navItem;
export const isDefaultItem = (navItem: SideNavItem): navItem is DefaultSideNavItem =>
  !isCustomItem(navItem);
