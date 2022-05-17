/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { NavigationCategories } from '../types';
import type { SecurityPageName } from '../../../../app/types';

export interface DefaultSideNavItem {
  id: SecurityPageName;
  label: string;
  href: string;
  onClick?: React.MouseEventHandler;
  description?: string;
  items?: DefaultSideNavItem[];
  categories?: NavigationCategories;
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
