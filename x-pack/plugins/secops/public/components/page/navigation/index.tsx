/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButton,
  EuiSpacer,
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
      <div>
        <EuiTabs>{this.renderTabs()}</EuiTabs>
        <AddData />
        <EuiSpacer />
      </div>
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

const AddData = pure(() => (
  <AddSources>
    <EuiButton href="kibana#home/tutorial_directory/security">Add data</EuiButton>
  </AddSources>
));

const AddSources = styled.div`
  float: right;
  margin-top: -10px;
  transform: translateY(-100%);
`;
