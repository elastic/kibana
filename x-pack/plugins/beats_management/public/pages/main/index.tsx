/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiTab,
  // @ts-ignore
  EuiTabs,
} from '@elastic/eui';
import React from 'react';
import { Redirect, Route, Switch, withRouter } from 'react-router-dom';
import { PrimaryLayout } from '../../components/layouts/primary';
import { ActivityPage } from './activity';
import { BeatsPage } from './beats';
import { TagsPage } from './tags';

interface MainPagesProps {
  history: any;
}

interface MainPagesState {
  selectedTabId: string;
  enrollBeat?: {
    enrollmentToken: string;
  } | null;
}

class MainPagesComponent extends React.PureComponent<MainPagesProps, MainPagesState> {
  constructor(props: any) {
    super(props);

    this.state = {
      selectedTabId: '/',
    };
  }
  public toggleEnrollBeat = () => {
    if (this.state.enrollBeat) {
      return this.setState({
        enrollBeat: null,
      });
    }

    // TODO: create a real enromment token
    return this.setState({
      enrollBeat: { enrollmentToken: '5g3i4ug5uy34g' },
    });
  };

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
      <PrimaryLayout
        title="Beats"
        actionSection={
          <Switch>
            <Route path="/beats/:action?/:enrollmentToken?" render={BeatsPage.ActionArea} />
          </Switch>
        }
      >
        <EuiTabs>{renderedTabs}</EuiTabs>

        <Switch>
          <Route
            path="/"
            exact={true}
            render={() => <Redirect from="/" exact={true} to="/beats" />}
          />
          <Route path="/beats/:action?/:enrollmentToken?" component={BeatsPage} />
          <Route path="/activity" exact={true} component={ActivityPage} />
          <Route path="/tags" exact={true} component={TagsPage} />
        </Switch>
      </PrimaryLayout>
    );
  }
}
export const MainPages = withRouter<any>(MainPagesComponent);
