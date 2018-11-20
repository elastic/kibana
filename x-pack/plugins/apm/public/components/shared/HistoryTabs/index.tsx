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
  name: string;
  component: React.SFC | React.ComponentClass;
}

export interface HistoryTabsProps extends RouteComponentProps {
  tabs: IHistoryTab[];
}

const HistoryTabsWithoutRouter = ({
  tabs,
  history,
  location
}: HistoryTabsProps) => {
  return (
    <React.Fragment>
      <EuiTabs>
        {tabs.map(tab => (
          <EuiTab
            onClick={() => history.push({ ...location, pathname: tab.path })}
            isSelected={location.pathname === tab.path}
            key={`${tab.path}--${tab.name}`}
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
      {tabs.map(tab => (
        <Route path={tab.path} component={tab.component} key={tab.path} />
      ))}
    </React.Fragment>
  );
};

const HistoryTabs = withRouter(HistoryTabsWithoutRouter);

export { HistoryTabsWithoutRouter, HistoryTabs };
