/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { KibanaFeature } from '@kbn/features-plugin/public';

import type { Space } from '../../../../common';
import { getTabs, type GetTabsProps, type ViewSpaceTab } from '../view_space_tabs';

type UseTabsProps = Omit<GetTabsProps, 'space' | 'features'> & {
  space: Space | null;
  features: KibanaFeature[] | null;
  currentSelectedTabId: string;
};

export const useTabs = ({
  space,
  features,
  currentSelectedTabId,
  ...getTabsArgs
}: UseTabsProps): [ViewSpaceTab[], JSX.Element | undefined] => {
  const [tabs, selectedTabContent] = useMemo(() => {
    if (space === null || features === null) {
      return [[]];
    }

    const _tabs = space != null ? getTabs({ space, features, ...getTabsArgs }) : [];
    return [_tabs, _tabs.find((obj) => obj.id === currentSelectedTabId)?.content];
  }, [space, features, getTabsArgs, currentSelectedTabId]);

  return [tabs, selectedTabContent];
};
