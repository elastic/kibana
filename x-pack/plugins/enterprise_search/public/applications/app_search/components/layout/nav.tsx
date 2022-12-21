/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useValues } from 'kea';

import { EuiSideNavItemType } from '@elastic/eui';

import { generateNavLink } from '../../../shared/layout';
import { ROLE_MAPPINGS_TITLE } from '../../../shared/role_mapping/constants';

import { AppLogic } from '../../app_logic';
import { ENGINES_PATH, SETTINGS_PATH, CREDENTIALS_PATH, USERS_AND_ROLES_PATH } from '../../routes';
import { CREDENTIALS_TITLE } from '../credentials';
import { useEngineNav } from '../engine/engine_nav';
import { ENGINES_TITLE } from '../engines';
import { SETTINGS_TITLE } from '../settings';

export const useAppSearchNav = () => {
  const {
    myRole: { canViewSettings, canViewAccountCredentials, canViewRoleMappings },
  } = useValues(AppLogic);

  const navItems: Array<EuiSideNavItemType<unknown>> = [
    {
      id: 'engines',
      name: ENGINES_TITLE,
      ...generateNavLink({
        to: ENGINES_PATH,
        shouldShowActiveForSubroutes: true,
        items: useEngineNav(),
      }),
    },
  ];

  if (canViewSettings) {
    navItems.push({
      id: 'settings',
      name: SETTINGS_TITLE,
      ...generateNavLink({ to: SETTINGS_PATH }),
    });
  }

  if (canViewAccountCredentials) {
    navItems.push({
      id: 'credentials',
      name: CREDENTIALS_TITLE,
      ...generateNavLink({ to: CREDENTIALS_PATH }),
    });
  }

  if (canViewRoleMappings) {
    navItems.push({
      id: 'usersRoles',
      name: ROLE_MAPPINGS_TITLE,
      ...generateNavLink({ to: USERS_AND_ROLES_PATH }),
    });
  }

  // Root level items are meant to be section headers, but the AS nav (currently)
  // isn't organized this way. So we create a fake empty parent item here
  // to cause all our navItems to properly render as nav links.
  return [{ id: '', name: '', items: navItems }];
};
