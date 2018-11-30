/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButton,
  // @ts-ignore
  EuiTab,
  // @ts-ignore
  EuiTabs,
} from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { getHostsUrl, getNetworkUrl, getOverviewUrl } from '../../link_to';

interface NavTab {
  id: string;
  name: string;
  href: string;
  disabled: boolean;
}

const navTabs: NavTab[] = [
  {
    id: 'overview',
    name: 'Overview',
    href: getOverviewUrl(),
    disabled: false,
  },
  {
    id: 'hosts',
    name: 'Hosts',
    href: getHostsUrl(),
    disabled: false,
  },
  {
    id: 'network',
    name: 'Network',
    href: getNetworkUrl(),
    disabled: false,
  },
];

interface NavigationState {
  selectedTabId: string;
}

const AddSources = styled.div`
  position: relative;
  top: -48px;
`;

const AddData = pure(() => (
  <AddSources>
    <EuiButton href="kibana#home/tutorial_directory/security" target="_blank">
      Add data
    </EuiButton>
  </AddSources>
));

const AddDataContainer = styled.div`
  display: flex;
  flex-direction: row;
  height: 0px;
  justify-content: flex-end;
  width: 100%;
`;

const NavigationContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
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
        <AddDataContainer>
          <AddData />
        </AddDataContainer>
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
