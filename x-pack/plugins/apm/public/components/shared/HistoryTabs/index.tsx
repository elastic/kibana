/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore otherwise TS complains "Module ''@elastic/eui'' has no exported member 'EuiTab'"
import { EuiTab, EuiTabs } from '@elastic/eui';
import React from 'react';
import { Route, RouteComponentProps, withRouter } from 'react-router-dom';

export interface IHistoryTab {
  path: string;
  name: React.ReactNode;
  component?: React.SFC | React.ComponentClass;
}

export interface HistoryTabsProps extends RouteComponentProps {
  tabs: IHistoryTab[];
  contentWrapper?: React.SFC | React.ComponentClass;
}

const HistoryTabsWithoutRouter = ({
  tabs,
  contentWrapper: ContentWrapper = React.Fragment,
  history,
  location
}: HistoryTabsProps) => {
  return (
    <React.Fragment>
      <EuiTabs>
        {tabs.map((tab, i) => (
          <EuiTab
            onClick={() => history.push({ ...location, pathname: tab.path })}
            isSelected={location.pathname === tab.path}
            key={`${tab.path}--${i}`}
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
      <ContentWrapper>
        {tabs.map(
          tab =>
            tab.component ? (
              <Route path={tab.path} component={tab.component} key={tab.path} />
            ) : null
        )}
      </ContentWrapper>
    </React.Fragment>
  );
};

const HistoryTabs = withRouter(HistoryTabsWithoutRouter);

export { HistoryTabsWithoutRouter, HistoryTabs };
