/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { ScopedHistory } from '@kbn/core-application-browser';
import type { KibanaFeature } from '@kbn/features-plugin/public';

import type { Space } from '../../../../common';
import { type EditSpaceTab, getTabs, type GetTabsProps } from '../edit_space_tabs';

type UseTabsProps = Pick<GetTabsProps, 'capabilities' | 'rolesCount'> & {
  space: Space | null;
  features: KibanaFeature[] | null;
  currentSelectedTabId: string;
  isRoleManagementEnabled: boolean;
  history: ScopedHistory;
  allowFeatureVisibility: boolean;
  allowSolutionVisibility: boolean;
};

export const useTabs = ({
  space,
  features,
  currentSelectedTabId,
  ...getTabsArgs
}: UseTabsProps): [EditSpaceTab[], JSX.Element | undefined] => {
  const [tabs, selectedTabContent] = useMemo(() => {
    if (space === null || features === null) {
      return [[]];
    }

    const _tabs = space != null ? getTabs({ space, features, ...getTabsArgs }) : [];
    return [_tabs, _tabs.find((obj) => obj.id === currentSelectedTabId)?.content];
  }, [space, features, getTabsArgs, currentSelectedTabId]);

  return [tabs, selectedTabContent];
};
