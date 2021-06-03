/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiSideNavItemType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { matchPath } from 'react-router-dom';
import { KibanaPageTemplateProps } from '../../../../../../../../src/plugins/kibana_react/public';
import { navTabs } from '../../../../app/home/home_navigations';
import { useKibana } from '../../../../common/lib/kibana';
import { APP_ID } from '../../../../../common/constants';

const translatedNavTitle = i18n.translate('xpack.securitySolution.navigation.mainLabel', {
  defaultMessage: 'Security',
});

const upperFirst = (str: string = ''): string => {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
};

export const useSecurityPageTemplateNav = (): KibanaPageTemplateProps['solutionNav'] => {
  const { application } = useKibana().services;
  const { navigateToApp } = application;
  const { pathname: currentPath } = window.location;

  const topLevelNavItems = useMemo<Array<EuiSideNavItemType<unknown>>>(
    () =>
      Object.values(navTabs).map(({ href, id, name }) => ({
        href,
        onClick: (ev: React.MouseEvent) => {
          ev.preventDefault();
          navigateToApp(`${APP_ID}:${id}`);
        },
        id,
        name: upperFirst(name),
        isSelected: matchPath(currentPath, { path: href }) !== null,
      })),
    [navigateToApp, currentPath]
  );

  const navItems = [
    {
      name: null,
      id: APP_ID,
      items: topLevelNavItems,
    },
  ];

  return {
    icon: 'logoSecurity',
    items: navItems,
    name: translatedNavTitle,
  };
};
