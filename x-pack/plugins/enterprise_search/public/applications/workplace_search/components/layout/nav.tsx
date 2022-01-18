/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSideNavItemType } from '@elastic/eui';

import { generateNavLink } from '../../../shared/layout';
import { NAV } from '../../constants';
import {
  API_KEYS_PATH,
  SOURCES_PATH,
  SECURITY_PATH,
  USERS_AND_ROLES_PATH,
  GROUPS_PATH,
  ORG_SETTINGS_PATH,
} from '../../routes';
import { useSourceSubNav } from '../../views/content_sources/components/source_sub_nav';
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
      ...generateNavLink({
        to: SOURCES_PATH,
        shouldShowActiveForSubroutes: true,
        items: useSourceSubNav(),
      }),
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
      ...generateNavLink({ to: USERS_AND_ROLES_PATH }),
    },
    {
      id: 'apiKeys',
      name: NAV.API_KEYS,
      ...generateNavLink({ to: API_KEYS_PATH }),
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
