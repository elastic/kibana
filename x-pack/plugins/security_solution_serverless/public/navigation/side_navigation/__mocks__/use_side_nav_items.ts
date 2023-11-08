/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SolutionSideNavItem } from '@kbn/security-solution-side-nav';

const { usePartitionFooterNavItems: originalUsePartitionFooterNavItems } =
  jest.requireActual('../use_side_nav_items');

export const useSideNavItems = jest.fn((): SolutionSideNavItem[] => []);

export const usePartitionFooterNavItems = jest.fn(
  (sideNavItems: SolutionSideNavItem[]): [SolutionSideNavItem[], SolutionSideNavItem[]] =>
    // Same implementation as original for convenience. Can be overridden in tests if needed
    originalUsePartitionFooterNavItems(sideNavItems)
);

export const useSideNavSelectedId = jest.fn((_sideNavItems: SolutionSideNavItem[]): string => '');
