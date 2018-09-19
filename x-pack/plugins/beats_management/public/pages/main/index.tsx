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
import { Route, Switch } from 'react-router-dom';
import { AppURLState } from '../../app';
import { PrimaryLayout } from '../../components/layouts/primary';
import { URLStateProps, withUrlState } from '../../containers/with_url_state';
import { FrontendLibs } from '../../lib/lib';
import { ActivityPage } from './activity';
import { BeatsPage } from './beats';
import { TagsPage } from './tags';

interface MainPagesProps extends URLStateProps<AppURLState> {
  libs: FrontendLibs;
}

interface MainPagesState {
  enrollBeat?: {
    enrollmentToken: string;
  } | null;
}

class MainPagesComponent extends React.PureComponent<MainPagesProps, MainPagesState> {
  constructor(props: MainPagesProps) {
    super(props);
  }
  public onSelectedTabChanged = (id: string) => {
    this.props.goTo(id);
  };

  public render() {
    const tabs = [
      {
        id: '/overview/beats',
        name: 'Beats List',
        disabled: false,
      },
      {
        id: '/overview/activity',
        name: 'Beats Activity',
        disabled: false,
      },
      {
        id: '/overview/tags',
        name: 'Tags',
        disabled: false,
      },
    ];

    const renderedTabs = tabs.map((tab, index) => (
      <EuiTab
        onClick={() => this.onSelectedTabChanged(tab.id)}
        isSelected={tab.id === this.props.pathname}
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
            <Route
              path="/overview/beats/:action?/:enrollmentToken?"
              render={() => <BeatsPage.ActionArea libs={this.props.libs} {...this.props} />}
            />
            <Route
              path="/overview/tags"
              render={() => <TagsPage.ActionArea libs={this.props.libs} {...this.props} />}
            />
          </Switch>
        }
      >
        <EuiTabs>{renderedTabs}</EuiTabs>

        <Switch>
          <Route
            path="/overview/beats/:action?/:enrollmentToken?"
            render={(props: any) => <BeatsPage libs={this.props.libs} {...props} />}
          />
          <Route
            path="/overview/activity"
            exact={true}
            render={(props: any) => <ActivityPage libs={this.props.libs} {...props} />}
          />
          <Route
            path="/overview/tags"
            exact={true}
            render={(props: any) => <TagsPage libs={this.props.libs} {...props} />}
          />
        </Switch>
      </PrimaryLayout>
    );
  }
}

export const MainPages = withUrlState<MainPagesProps>(MainPagesComponent);
