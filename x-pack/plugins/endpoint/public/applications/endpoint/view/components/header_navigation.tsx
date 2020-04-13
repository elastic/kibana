/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { MouseEvent, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTabs, EuiTab } from '@elastic/eui';
import { useHistory, useLocation } from 'react-router-dom';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { Immutable } from '../../../../../common/types';

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

export const HeaderNavigation: React.FunctionComponent = React.memo(() => {
  const history = useHistory();
  const location = useLocation();
  const { services } = useKibana();
  const BASE_PATH = services.application.getUrlForApp('endpoint');

  const tabList = useMemo(() => {
    return navTabs.map((tab, index) => {
      return (
        <EuiTab
          data-test-subj={`${tab.id}EndpointTab`}
          key={index}
          href={`${BASE_PATH}${tab.href}`}
          onClick={(event: MouseEvent) => {
            event.preventDefault();
            history.push(tab.href);
          }}
          isSelected={
            tab.href === location.pathname ||
            (tab.href !== '/' && location.pathname.startsWith(tab.href))
          }
        >
          {tab.name}
        </EuiTab>
      );
    });
  }, [BASE_PATH, history, location.pathname]);

  return <EuiTabs>{tabList}</EuiTabs>;
});
