/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMenuConfig, AppMenuItemType } from '@kbn/core-chrome-app-menu-components';

/**
 * Combines page-local AppHeader menu actions with the global APM app menu.
 * Page items are listed first so they stay visible when the overflow limit applies.
 * When the page supplies `primaryActionItem`, it wins the primary slot and the global
 * primary (e.g. Add data) is demoted into overflow items so it is not lost.
 */
export function mergeAppMenuConfigs(
  globalMenu: AppMenuConfig | undefined,
  pageMenu: AppMenuConfig | undefined
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
    pagePrimary && globalPrimary
      ? [
          {
            ...globalPrimary,
            overflow: true,
          },
        ]
      : [];

  return {
    switch: pageMenu.switch ?? globalMenu.switch,
    primaryActionItem: pagePrimary ?? globalPrimary,
    items: [...(pageMenu.items ?? []), ...demotedGlobalPrimary, ...(globalMenu.items ?? [])],
  };
}
