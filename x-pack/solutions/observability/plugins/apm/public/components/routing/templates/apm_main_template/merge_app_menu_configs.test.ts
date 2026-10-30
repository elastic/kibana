/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeAppMenuConfigs } from './merge_app_menu_configs';

describe('mergeAppMenuConfigs', () => {
  const globalMenu = {
    items: [
      {
        id: 'settings',
        label: 'Settings',
        href: '/settings',
        iconType: 'gear' as const,
        overflow: true as const,
      },
    ],
    primaryActionItem: {
      id: 'addData',
      label: 'Add data',
      href: '/add-data',
      iconType: 'plusCircle' as const,
      testId: 'apmAddDataHeaderLink',
    },
  };

  const pageMenu = {
    items: [
      {
        id: 'exploreData',
        label: 'Explore data',
        href: '/explore',
        iconType: 'chartBarVerticalStack' as const,
        testId: 'apmAnalyzeDataButtonExploreDataButton',
      },
    ],
  };

  it('returns the global menu when page menu is omitted', () => {
    expect(mergeAppMenuConfigs(globalMenu, undefined)).toBe(globalMenu);
  });

  it('returns the page menu when global menu is omitted', () => {
    expect(mergeAppMenuConfigs(undefined, pageMenu)).toBe(pageMenu);
  });

  it('prepends page items and keeps the global primary', () => {
    expect(mergeAppMenuConfigs(globalMenu, pageMenu)).toEqual({
      switch: undefined,
      primaryActionItem: globalMenu.primaryActionItem,
      items: [...pageMenu.items, ...globalMenu.items],
    });
  });

  it('lets the page primary win and demotes the global primary into overflow', () => {
    const pageWithPrimary = {
      primaryActionItem: {
        id: 'editServiceGroup',
        label: 'Edit group',
        iconType: 'pencil' as const,
        testId: 'apmEditButtonEditGroupButton',
        run: () => {},
      },
    };

    expect(mergeAppMenuConfigs(globalMenu, pageWithPrimary)).toEqual({
      switch: undefined,
      primaryActionItem: pageWithPrimary.primaryActionItem,
      items: [
        {
          ...globalMenu.primaryActionItem,
          overflow: true,
        },
        ...globalMenu.items,
      ],
    });
  });
});
