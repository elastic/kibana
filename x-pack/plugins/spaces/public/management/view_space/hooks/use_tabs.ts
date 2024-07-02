/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { KibanaFeature } from '@kbn/features-plugin/public';
import type { Role } from '@kbn/security-plugin-types-common';

import type { Space } from '../../../../common';
import type { ViewSpaceTab } from '../view_space_tabs';
import { getTabs } from '../view_space_tabs';

export const useTabs = (
  space: Space | null,
  features: KibanaFeature[] | null,
  roles: Role[],
  currentSelectedTabId: string
): [ViewSpaceTab[], JSX.Element | undefined] => {
  const [tabs, selectedTabContent] = useMemo(() => {
    if (space == null || features == null) {
      return [[]];
    }
    const _tabs = space != null ? getTabs(space, features, roles) : [];
    return [_tabs, _tabs.find((obj) => obj.id === currentSelectedTabId)?.content];
  }, [space, currentSelectedTabId, features, roles]);

  return [tabs, selectedTabContent];
};
