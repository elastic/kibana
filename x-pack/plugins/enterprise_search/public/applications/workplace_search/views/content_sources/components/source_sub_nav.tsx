/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useValues } from 'kea';

import { EuiSideNavItemType } from '@elastic/eui';

import { generateNavLink } from '../../../../shared/layout';
import { AppLogic } from '../../../app_logic';
import { NAV, CUSTOM_SERVICE_TYPE } from '../../../constants';
import {
  getContentSourcePath,
  SOURCE_DETAILS_PATH,
  SOURCE_CONTENT_PATH,
  SOURCE_SCHEMAS_PATH,
  SOURCE_DISPLAY_SETTINGS_PATH,
  SOURCE_SETTINGS_PATH,
} from '../../../routes';
import { SourceLogic } from '../source_logic';

export const useSourceSubNav = () => {
  const { isOrganization } = useValues(AppLogic);
  const {
    contentSource: { id, serviceType },
  } = useValues(SourceLogic);

  if (!id) return undefined;

  const navItems: Array<EuiSideNavItemType<unknown>> = [
    {
      id: 'sourceOverview',
      name: NAV.OVERVIEW,
      ...generateNavLink({ to: getContentSourcePath(SOURCE_DETAILS_PATH, id, isOrganization) }),
    },
    {
      id: 'sourceContent',
      name: NAV.CONTENT,
      ...generateNavLink({ to: getContentSourcePath(SOURCE_CONTENT_PATH, id, isOrganization) }),
    },
  ];

  const isCustom = serviceType === CUSTOM_SERVICE_TYPE;
  if (isCustom) {
    navItems.push({
      id: 'sourceSchema',
      name: NAV.SCHEMA,
      ...generateNavLink({
        to: getContentSourcePath(SOURCE_SCHEMAS_PATH, id, isOrganization),
        shouldShowActiveForSubroutes: true,
      }),
    });
    navItems.push({
      id: 'sourceDisplaySettings',
      name: NAV.DISPLAY_SETTINGS,
      ...generateNavLink({
        to: getContentSourcePath(SOURCE_DISPLAY_SETTINGS_PATH, id, isOrganization),
        shouldShowActiveForSubroutes: true,
      }),
    });
  }

  navItems.push({
    id: 'sourceSettings',
    name: NAV.SETTINGS,
    ...generateNavLink({ to: getContentSourcePath(SOURCE_SETTINGS_PATH, id, isOrganization) }),
  });

  return navItems;
};
