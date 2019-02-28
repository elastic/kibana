/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiTab, EuiTabs } from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';

import { getHostsUrl, getNetworkUrl, getOverviewUrl } from '../../link_to';

import * as i18n from './translations';

interface NavTab {
  id: string;
  name: string;
  href: string;
  disabled: boolean;
}

const navTabs: NavTab[] = [
  {
    id: 'overview',
    name: i18n.OVERVIEW,
    href: getOverviewUrl(),
    disabled: false,
  },
  {
    id: 'hosts',
    name: i18n.HOSTS,
    href: getHostsUrl(),
    disabled: false,
  },
  {
    id: 'network',
    name: i18n.NETWORK,
    href: getNetworkUrl(),
    disabled: false,
  },
];

interface NavigationState {
  selectedTabId: string;
}

const NavigationContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-top: -8px;
`;

export class Navigation extends React.PureComponent<{}, NavigationState> {
  public readonly state = {
    selectedTabId: navTabs.reduce((res, tab) => {
      if (window.location.hash.includes(tab.id)) {
        res = tab.id;
      }
      return res;
    }, ''),
  };

  public render() {
    return (
      <NavigationContainer>
        <EuiTabs>{this.renderTabs()}</EuiTabs>
      </NavigationContainer>
    );
  }

  private handleTabClick = (href: string, id: string) => {
    this.setState({
      ...this.state,
      selectedTabId: id,
    });
    window.location.assign(href);
  };

  private renderTabs = () =>
    navTabs.map((tab: NavTab) => (
      <EuiTab
        data-href={tab.href}
        onClick={() => this.handleTabClick(tab.href, tab.id)}
        isSelected={this.state.selectedTabId === tab.id}
        disabled={tab.disabled}
        key={`navigation-${tab.id}`}
      >
        {tab.name}
      </EuiTab>
    ));
}
