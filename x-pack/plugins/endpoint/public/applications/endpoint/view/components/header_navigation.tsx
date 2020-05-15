/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTabs, EuiTab } from '@elastic/eui';
import { useLocation } from 'react-router-dom';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { Immutable } from '../../../../../common/types';
import { useNavigateByRouterEventHandler } from '../hooks/use_navigate_by_router_event_handler';

interface NavTabs {
  name: string;
  id: string;
  href: string;
}

const navTabs: Immutable<NavTabs[]> = [
  {
    id: 'home',
    name: i18n.translate('xpack.endpoint.headerNav.home', {
      defaultMessage: 'Home',
    }),
    href: '/',
  },
  {
    id: 'hosts',
    name: i18n.translate('xpack.endpoint.headerNav.hosts', {
      defaultMessage: 'Hosts',
    }),
    href: '/hosts',
  },
  {
    id: 'alerts',
    name: i18n.translate('xpack.endpoint.headerNav.alerts', {
      defaultMessage: 'Alerts',
    }),
    href: '/alerts',
  },
  {
    id: 'policies',
    name: i18n.translate('xpack.endpoint.headerNav.policies', {
      defaultMessage: 'Policies',
    }),
    href: '/policy',
  },
];

const NavTab = memo<{ tab: NavTabs }>(({ tab }) => {
  const { pathname } = useLocation();
  const { services } = useKibana();
  const onClickHandler = useNavigateByRouterEventHandler(tab.href);
  const BASE_PATH = services.application.getUrlForApp('endpoint');

  return (
    <EuiTab
      data-test-subj={`${tab.id}EndpointTab`}
      href={`${BASE_PATH}${tab.href}`}
      onClick={onClickHandler}
      isSelected={tab.href === pathname || (tab.href !== '/' && pathname.startsWith(tab.href))}
    >
      {tab.name}
    </EuiTab>
  );
});

export const HeaderNavigation: React.FunctionComponent = React.memo(() => {
  const tabList = useMemo(() => {
    return navTabs.map((tab, index) => {
      return <NavTab tab={tab} key={index} />;
    });
  }, []);

  return <EuiTabs>{tabList}</EuiTabs>;
});
