/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTab, EuiTabs } from '@elastic/eui';
import React from 'react';
import { Link, Route } from 'react-router-dom';

interface TabConfiguration {
  title: string;
  path: string;
}

interface RoutedTabsProps {
  tabs: TabConfiguration[];
}

const noop = () => undefined;

export class RoutedTabs extends React.Component<RoutedTabsProps> {
  public render() {
    return <EuiTabs>{this.renderTabs()}</EuiTabs>;
  }

  private renderTabs() {
    return this.props.tabs.map(tab => {
      return (
        <Route
          key={`${tab.path}${tab.title}`}
          path={tab.path}
          children={({ match }) => (
            <EuiTab onClick={noop} isSelected={match !== null}>
              <Link to={tab.path}>{tab.title}</Link>
            </EuiTab>
          )}
        />
      );
    });
  }
}
