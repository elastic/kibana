/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import { Route, RouteComponentProps, Switch } from 'react-router-dom';

import { EuiPageBody, EuiPageContent, EuiSpacer, EuiTab, EuiTabs, EuiTitle } from '@elastic/eui';

import { BASE_PATH } from '../../constants';
import { AppContext, AppContextInterface } from '../../services/app_context';

import { RepositoryList } from './repository_list';
import { SnapshotList } from './snapshot_list';

type Section = 'repositories' | 'snapshots';

interface MatchParams {
  section: Section;
}

interface Props extends RouteComponentProps<MatchParams> {}

interface State {
  activeSection: Section;
}

export class SnapshotRestoreHome extends PureComponent<Props, State> {
  public static contextType = AppContext;

  public static getDerivedStateFromProps(nextProps: Props) {
    const {
      match: {
        params: { section },
      },
    } = nextProps;
    return {
      activeSection: section,
    };
  }
  public context!: React.ContextType<typeof AppContext>;

  public readonly state: Readonly<State> = {
    activeSection: 'repositories' as Section,
  };

  public componentDidMount() {
    const {
      core: { i18n, chrome },
      plugins: { management },
    } = this.context as AppContextInterface;

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

  public onSectionChange = (section: Section): void => {
    const { history } = this.props;
    history.push(`${BASE_PATH}/${section}`);
  };

  public render() {
    const {
      core: {
        i18n: { FormattedMessage },
      },
    } = this.context as AppContextInterface;

    const tabs = [
      {
        id: 'snapshots' as Section,
        name: (
          <FormattedMessage
            id="xpack.snapshotRestore.home.snapshotsTabTitle"
            defaultMessage="Snapshots"
          />
        ),
        testSubj: 'srSnapshotsTab',
      },
      {
        id: 'repositories' as Section,
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
