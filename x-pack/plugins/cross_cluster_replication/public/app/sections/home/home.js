/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import { Route, Switch } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiPageBody, EuiPageContent, EuiSpacer, EuiTab, EuiTabs, EuiTitle } from '@elastic/eui';

import { setBreadcrumbs, listBreadcrumb } from '../../services/breadcrumbs';
import { routing } from '../../services/routing';
import { AutoFollowPatternList } from './auto_follow_pattern_list';
import { FollowerIndicesList } from './follower_indices_list';

export class CrossClusterReplicationHome extends PureComponent {
  state = {
    activeSection: 'follower_indices',
  };

  tabs = [
    {
      id: 'follower_indices',
      name: (
        <FormattedMessage
          id="xpack.crossClusterReplication.autoFollowPatternList.followerIndicesTitle"
          defaultMessage="Follower indices"
        />
      ),
      testSubj: 'followerIndicesTab',
    },
    {
      id: 'auto_follow_patterns',
      name: (
        <FormattedMessage
          id="xpack.crossClusterReplication.autoFollowPatternList.autoFollowPatternsTitle"
          defaultMessage="Auto-follow patterns"
        />
      ),
      testSubj: 'autoFollowPatternsTab',
    },
  ];

  componentDidMount() {
    setBreadcrumbs([listBreadcrumb()]);
  }

  static getDerivedStateFromProps(props) {
    const {
      match: {
        params: { section },
      },
    } = props;
    return {
      activeSection: section,
    };
  }

  onSectionChange = (section) => {
    setBreadcrumbs([listBreadcrumb(`/${section}`)]);
    routing.navigate(`/${section}`);
  };

  render() {
    return (
      <EuiPageBody>
        <EuiPageContent>
          <EuiTitle size="l" data-test-subj="appTitle">
            <h1>
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPatternList.crossClusterReplicationTitle"
                defaultMessage="Cross-Cluster Replication"
              />
            </h1>
          </EuiTitle>

          <EuiSpacer size="s" />

          <EuiTabs>
            {this.tabs.map((tab) => (
              <EuiTab
                onClick={() => this.onSectionChange(tab.id)}
                isSelected={tab.id === this.state.activeSection}
                key={tab.id}
                data-test-subj={tab.testSubj}
              >
                {tab.name}
              </EuiTab>
            ))}
          </EuiTabs>

          <EuiSpacer size="m" />

          <Switch>
            <Route exact path={`/follower_indices`} component={FollowerIndicesList} />
            <Route exact path={`/auto_follow_patterns`} component={AutoFollowPatternList} />
          </Switch>
        </EuiPageContent>
      </EuiPageBody>
    );
  }
}
