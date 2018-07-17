/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiTab, EuiTabs } from '@elastic/eui';
import React from 'react';
import { Route, Switch, withRouter } from 'react-router-dom';
import { PrimaryLayout } from '../../components/layouts/primary';
import { ActivityPage } from './activity';
import { BeatsPage } from './beats';
import { TagsPage } from './tags';

interface MainPagesProps {
  history: any;
}

class MainPagesComponent extends React.PureComponent<MainPagesProps> {
  constructor(props: any) {
    super(props);

    this.state = {
      selectedTabId: '/',
    };
  }

  public onSelectedTabChanged = (id: string) => {
    this.props.history.push(id);
  };

  public render() {
    const tabs = [
      {
        id: '/',
        name: 'Beats List',
        disabled: false,
      },
      {
        id: '/activity',
        name: 'Beats Activity',
        disabled: false,
      },
      {
        id: '/tags',
        name: 'Tags',
        disabled: false,
      },
    ];

    const renderedTabs = tabs.map((tab, index) => (
      <EuiTab
        onClick={() => this.onSelectedTabChanged(tab.id)}
        isSelected={tab.id === this.props.history.location.pathname}
        disabled={tab.disabled}
        key={index}
      >
        {tab.name}
      </EuiTab>
    ));
    return (
      <PrimaryLayout title="Beats">
        <EuiTabs>{renderedTabs}</EuiTabs>
        <Switch>
          <Route path="/" exact={true} component={BeatsPage} />
          <Route path="/activity" exact={true} component={ActivityPage} />
          <Route path="/tags" exact={true} component={TagsPage} />
        </Switch>
      </PrimaryLayout>
    );
  }
}
export const MainPages = withRouter<any>(MainPagesComponent);
