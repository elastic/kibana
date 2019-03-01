/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import { Route, Switch } from 'react-router-dom';

import { EuiPageBody, EuiPageContent, EuiSpacer, EuiTab, EuiTabs, EuiTitle } from '@elastic/eui';

import { BASE_PATH } from '../../constants';
import { AppContext } from '../../services/app_context';

import { RepositoryList } from '../repository_list';
import { SnapshotList } from '../snapshot_list';

export class SnapshotRestoreHome extends PureComponent {
  public static contextType = AppContext;

  public static getDerivedStateFromProps(props) {
    const {
      match: {
        params: { section },
      },
    } = props;
    return {
      activeSection: section,
    };
  }

  public state = {
    activeSection: 'repositories',
  };

  public componentDidMount() {
    const {
      core: { i18n, chrome },
      plugins: { management },
    } = this.context;

    chrome.breadcrumbs.set([
      management.constants.BREADCRUMB,
      {
        text: i18n.translate('xpack.snapshotRestore.home.BreadcrumbTitle', {
          defaultMessage: 'Snapshot and Restore',
        }),
        href: `#${BASE_PATH}`,
      },
    ]);
  }

  public onSectionChange = section => {
    const { history } = this.props;
    history.push(`${BASE_PATH}/${section}`);
  };

  public render() {
    const {
      core: {
        i18n: { FormattedMessage },
      },
    } = this.context;
    const tabs = [
      {
        id: 'snapshots',
        name: (
          <FormattedMessage
            id="xpack.snapshotRestore.home.snapshotsTabTitle"
            defaultMessage="Snapshots"
          />
        ),
        testSubj: 'srSnapshotsTab',
      },
      {
        id: 'repositories',
        name: (
          <FormattedMessage
            id="xpack.snapshotRestore.home.repositoriesTabTitle"
            defaultMessage="Repositories"
          />
        ),
        testSubj: 'srRepositoriesTab',
      },
    ];

    return (
      <EuiPageBody>
        <EuiPageContent>
          <EuiTitle size="l">
            <h1>
              <FormattedMessage
                id="xpack.snapshotRestore.home.snapshotRestoreTitle"
                defaultMessage="Snapshot and Restore"
              />
            </h1>
          </EuiTitle>

          <EuiSpacer size="s" />

          <EuiTabs>
            {tabs.map(tab => (
              <EuiTab
                onClick={() => this.onSectionChange(tab.id)}
                isSelected={tab.id === this.state.activeSection}
                key={tab.id}
                data-test-subject={tab.testSubj}
              >
                {tab.name}
              </EuiTab>
            ))}
          </EuiTabs>

          <EuiSpacer size="m" />

          <Switch>
            <Route exact path={`${BASE_PATH}/repositories`} component={RepositoryList} />
            <Route exact path={`${BASE_PATH}/snapshots`} component={SnapshotList} />
          </Switch>
        </EuiPageContent>
      </EuiPageBody>
    );
  }
}
