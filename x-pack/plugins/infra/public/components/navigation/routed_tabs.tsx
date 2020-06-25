/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiTab, EuiTabs } from '@elastic/eui';
import React from 'react';
import { Route } from 'react-router-dom';

import { euiStyled } from '../../../../observability/public';
import { useLinkProps } from '../../hooks/use_link_props';
import { LinkDescriptor } from '../../hooks/use_link_props';

interface TabConfig {
  title: string | React.ReactNode;
}

type TabConfiguration = TabConfig & LinkDescriptor;

interface RoutedTabsProps {
  tabs: TabConfiguration[];
}

const noop = () => {};

export const RoutedTabs = ({ tabs }: RoutedTabsProps) => {
  return (
    <EuiTabs display="condensed">
      {tabs.map((tab) => {
        return <Tab key={`${tab.pathname}-${tab.title}`} {...tab} />;
      })}
    </EuiTabs>
  );
};

const Tab = ({ title, pathname, app }: TabConfiguration) => {
  const linkProps = useLinkProps({ app, pathname });
  return (
    <Route
      path={pathname}
      children={({ match, history }) => {
        return (
          <TabContainer className="euiTab">
            {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
            <EuiLink {...linkProps} data-test-subj={`infrastructureNavLink_${pathname}`}>
              <EuiTab onClick={noop} isSelected={match !== null}>
                {title}
              </EuiTab>
            </EuiLink>
          </TabContainer>
        );
      }}
    />
  );
};

const TabContainer = euiStyled.div`
  .euiLink {
    color: inherit !important;
  }
`;
