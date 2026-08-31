/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AppMenuConfig,
  AppMenuItemType,
  AppMenuPrimaryActionItem,
} from '@kbn/core-chrome-app-menu-components';

/**
 * Moves a primary action into the overflow ("More") item list.
 * Primary and item unions are structurally close but not assignable
 * (primary allows `splitButtonProps` and looser popover fields on button/link variants).
 */
function demotePrimaryToOverflowItem(primary: AppMenuPrimaryActionItem): AppMenuItemType {
  const { splitButtonProps: _splitButtonProps, ...item } = primary;
  return {
    ...item,
    overflow: true,
  } as AppMenuItemType;
}

/**
 * Combines page-local AppHeader menu actions with the global APM app menu.
 * Page items are listed first so they stay visible when the overflow limit applies.
 * When the page supplies `primaryActionItem`, it wins the primary slot and the global
 * primary (e.g. Add data) is demoted into overflow items so it is not lost.
 */
export function mergeAppMenuConfigs(
  globalMenu?: AppMenuConfig,
  pageMenu?: AppMenuConfig
): AppMenuConfig | undefined {
  if (!pageMenu) {
    return globalMenu;
  }
  if (!globalMenu) {
    return pageMenu;
  }

  const pagePrimary = pageMenu.primaryActionItem;
  const globalPrimary = globalMenu.primaryActionItem;
  const demotedGlobalPrimary: AppMenuItemType[] =
    pagePrimary && globalPrimary ? [demotePrimaryToOverflowItem(globalPrimary)] : [];

  return {
    switch: pageMenu.switch ?? globalMenu.switch,
    primaryActionItem: pagePrimary ?? globalPrimary,
    items: [...(pageMenu.items ?? []), ...demotedGlobalPrimary, ...(globalMenu.items ?? [])],
  };
}
