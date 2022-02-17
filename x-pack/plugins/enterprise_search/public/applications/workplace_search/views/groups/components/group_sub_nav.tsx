/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useValues } from 'kea';

import { EuiSideNavItemType } from '@elastic/eui';

import { generateNavLink } from '../../../../shared/layout';
import { NAV } from '../../../constants';
import { getGroupPath, getGroupSourcePrioritizationPath } from '../../../routes';
import { GroupLogic } from '../group_logic';

export const useGroupSubNav = () => {
  const {
    group: { id },
  } = useValues(GroupLogic);

  if (!id) return undefined;

  const navItems: Array<EuiSideNavItemType<unknown>> = [
    {
      id: 'groupOverview',
      name: NAV.GROUP_OVERVIEW,
      ...generateNavLink({ to: getGroupPath(id) }),
    },
    {
      id: 'groupSourcePrioritization',
      name: NAV.SOURCE_PRIORITIZATION,
      ...generateNavLink({ to: getGroupSourcePrioritizationPath(id) }),
    },
  ];

  return navItems;
};
