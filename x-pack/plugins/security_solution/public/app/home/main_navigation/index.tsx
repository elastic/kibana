/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { EuiIcon, EuiSideNav } from '@elastic/eui';
import { APP_ID, APP_NAME } from '../../../../common/constants';
import { navTabs } from '../home_navigations';
import { useKibana } from '../../../common/lib/kibana';

const translatedNavTitle = i18n.translate('xpack.securitySolution.navigation.mainLabel', {
  defaultMessage: 'Navigation',
});

const StyledSpan = styled.span`
  text-transform: capitalize;
`;

export const MainNavigation = () => {
  const [isSideNavOpenOnMobile, setisSideNavOpenOnMobile] = useState(false);

  const toggleOpenOnMobile = () => {
    setisSideNavOpenOnMobile(!isSideNavOpenOnMobile);
  };

  const { pathname } = window.location;
  const {
    application: { navigateToApp },
  } = useKibana().services;

  const topLevelItems = useMemo(
    () =>
      Object.values(navTabs).map(({ href, id, name }) => ({
        href,
        onClick: (ev: React.MouseEvent) => {
          ev.preventDefault();
          navigateToApp(`${APP_ID}:${id}`);
        },
        id,
        name: <StyledSpan>{name}</StyledSpan>,
        isSelected: pathname.indexOf(href) === 0,
      })),
    [navigateToApp, pathname]
  );

  const navItems = [
    {
      name: APP_NAME,
      icon: <EuiIcon type="logoSecurity" />,
      id: APP_ID,
      items: topLevelItems,
    },
  ];

  return (
    <EuiSideNav
      aria-label={translatedNavTitle}
      mobileTitle={translatedNavTitle}
      style={{ width: 192, padding: 14 }}
      toggleOpenOnMobile={() => toggleOpenOnMobile()}
      isOpenOnMobile={isSideNavOpenOnMobile}
      items={navItems}
    />
  );
};
