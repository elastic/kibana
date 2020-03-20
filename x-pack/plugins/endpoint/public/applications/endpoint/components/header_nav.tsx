/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { MouseEvent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTabs, EuiTab } from '@elastic/eui';
import { useHistory, useLocation } from 'react-router-dom';

export interface NavTabs {
  name: string;
  id: string;
  href: string;
}

export const navTabs: NavTabs[] = [
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

export const HeaderNavigation: React.FunctionComponent<{ basename: string }> = React.memo(
  ({ basename }) => {
    const history = useHistory();
    const location = useLocation();

    function renderNavTabs(tabs: NavTabs[]) {
      return tabs.map((tab, index) => {
        return (
          <EuiTab
            data-test-subj={`${tab.id}EndpointTab`}
            key={index}
            href={`${basename}${tab.href}`}
            onClick={(event: MouseEvent) => {
              event.preventDefault();
              history.push(tab.href);
            }}
            isSelected={tab.href === location.pathname}
          >
            {tab.name}
          </EuiTab>
        );
      });
    }

    return <EuiTabs>{renderNavTabs(navTabs)}</EuiTabs>;
  }
);
