/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSideNavItemType, EuiSpacer } from '@elastic/eui';

import { WORKPLACE_SEARCH_PLUGIN } from '../../../../../common/constants';
import { generateNavLink, SideNav, SideNavLink } from '../../../shared/layout';
import { NAV } from '../../constants';
import {
  SOURCES_PATH,
  SECURITY_PATH,
  ROLE_MAPPINGS_PATH,
  GROUPS_PATH,
  ORG_SETTINGS_PATH,
} from '../../routes';
import { useGroupSubNav } from '../../views/groups/components/group_sub_nav';
import { useSettingsSubNav } from '../../views/settings/components/settings_sub_nav';

export const useWorkplaceSearchNav = () => {
  const navItems: Array<EuiSideNavItemType<unknown>> = [
    {
      id: 'root',
      name: NAV.OVERVIEW,
      ...generateNavLink({ to: '/', isRoot: true }),
    },
    {
      id: 'sources',
      name: NAV.SOURCES,
      ...generateNavLink({ to: SOURCES_PATH }),
      items: [], // TODO: Source subnav
    },
    {
      id: 'groups',
      name: NAV.GROUPS,
      ...generateNavLink({ to: GROUPS_PATH }),
      items: useGroupSubNav(),
    },
    {
      id: 'usersRoles',
      name: NAV.ROLE_MAPPINGS,
      ...generateNavLink({ to: ROLE_MAPPINGS_PATH }),
    },
    {
      id: 'security',
      name: NAV.SECURITY,
      ...generateNavLink({ to: SECURITY_PATH }),
    },
    {
      id: 'settings',
      name: NAV.SETTINGS,
      ...generateNavLink({ to: ORG_SETTINGS_PATH }),
      items: useSettingsSubNav(),
    },
  ];

  // Root level items are meant to be section headers, but the WS nav (currently)
  // isn't organized this way. So we crate a fake empty parent item here
  // to cause all our navItems to properly render as nav links.
  return [{ id: '', name: '', items: navItems }];
};

// TODO: Delete below once fully migrated to KibanaPageTemplate

interface Props {
  sourcesSubNav?: React.ReactNode;
  groupsSubNav?: React.ReactNode;
  settingsSubNav?: React.ReactNode;
}

export const WorkplaceSearchNav: React.FC<Props> = ({
  sourcesSubNav,
  groupsSubNav,
  settingsSubNav,
}) => (
  <SideNav product={WORKPLACE_SEARCH_PLUGIN}>
    <SideNavLink to="/" isRoot>
      {NAV.OVERVIEW}
    </SideNavLink>
    <SideNavLink to={SOURCES_PATH} subNav={sourcesSubNav}>
      {NAV.SOURCES}
    </SideNavLink>
    <SideNavLink to={GROUPS_PATH} subNav={groupsSubNav}>
      {NAV.GROUPS}
    </SideNavLink>
    <SideNavLink shouldShowActiveForSubroutes to={ROLE_MAPPINGS_PATH}>
      {NAV.ROLE_MAPPINGS}
    </SideNavLink>
    <SideNavLink to={SECURITY_PATH}>{NAV.SECURITY}</SideNavLink>
    <SideNavLink subNav={settingsSubNav} to={ORG_SETTINGS_PATH}>
      {NAV.SETTINGS}
    </SideNavLink>
    <EuiSpacer />
  </SideNav>
);
