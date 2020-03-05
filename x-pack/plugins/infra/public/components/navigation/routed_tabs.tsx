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

interface TabConfiguration {
  title: string | React.ReactNode;
  path: string;
}

interface RoutedTabsProps {
  tabs: TabConfiguration[];
}

const noop = () => {};

export const RoutedTabs = ({ tabs }: RoutedTabsProps) => {
  return (
    <EuiTabs display="condensed">
      {tabs.map(tab => {
        return <Tab key={`${tab.path}-${tab.title}`} {...tab} />;
      })}
    </EuiTabs>
  );
};

const Tab = ({ title, path }: TabConfiguration) => {
  const linkProps = useLinkProps({ pathname: path });
  return (
    <Route
      path={path}
      children={({ match, history }) => {
        return (
          <TabContainer className="euiTab">
            {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
            <EuiLink {...linkProps} data-test-subj={`infrastructureNavLink_${path}`}>
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
