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

export const Navigation = pure(() => (
  <div>
    <EuiTabs>{renderTabs()}</EuiTabs>
    <AddData />
    <EuiSpacer />
  </div>
));

const renderTabs = () =>
  navTabs.map((tab: NavTab) => (
    <EuiTab
      onClick={() => window.location.assign(tab.href)}
      isSelected={window.location.hash.includes(tab.id)}
      disabled={tab.disabled}
      key={`navigation-${tab.id}`}
    >
      {tab.name}
    </EuiTab>
  ));

const AddData: React.SFC = () => (
  <div
    style={{
      margin: '0 5px',
    }}
  >
    <AddSources>
      <EuiButton href="kibana#home/tutorial_directory/security">Add data</EuiButton>
    </AddSources>
  </div>
);

const AddSources = styled.div`
  float: right;
  margin-top: -10px;
  -webkit-transform: translateY(100%);
  transform: translateY(-100%);
`;
