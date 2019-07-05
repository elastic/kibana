/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import React from 'react';
import {
  matchPath,
  Route,
  RouteComponentProps,
  withRouter
} from 'react-router-dom';

export interface IHistoryTab {
  path: string;
  routePath?: string;
  name: React.ReactNode;
  render?: (props: RouteComponentProps) => React.ReactNode;
}

export interface HistoryTabsProps extends RouteComponentProps {
  tabs: IHistoryTab[];
}

function isTabSelected(tab: IHistoryTab, currentPath: string) {
  if (tab.routePath) {
    return !!matchPath(currentPath, { path: tab.routePath, exact: true });
  }
  return currentPath === tab.path;
}

const HistoryTabsWithoutRouter = ({
  tabs,
  history,
  location
}: HistoryTabsProps) => {
  return (
    <React.Fragment>
      <EuiTabs>
        {tabs.map((tab, i) => (
          <EuiTab
            onClick={() => history.push({ ...location, pathname: tab.path })}
            isSelected={isTabSelected(tab, location.pathname)}
            key={`${tab.path}--${i}`}
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer />
      {tabs.map(tab =>
        tab.render ? (
          <Route
            path={tab.routePath || tab.path}
            render={tab.render}
            key={tab.path}
          />
        ) : null
      )}
    </React.Fragment>
  );
};

const HistoryTabs = withRouter(HistoryTabsWithoutRouter);

export { HistoryTabsWithoutRouter, HistoryTabs };
