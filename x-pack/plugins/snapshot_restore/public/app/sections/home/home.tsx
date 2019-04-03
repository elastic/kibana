/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import { Route, RouteComponentProps, Switch } from 'react-router-dom';

import { EuiPageBody, EuiPageContent, EuiSpacer, EuiTab, EuiTabs, EuiTitle } from '@elastic/eui';

import { BASE_PATH, Section } from '../../constants';
import { useAppDependencies } from '../../index';
import { breadcrumbService } from '../../services/breadcrumb';

import { RepositoryList } from './repository_list';
import { SnapshotList } from './snapshot_list';

interface MatchParams {
  section: Section;
}

interface Props extends RouteComponentProps<MatchParams> {}

export const SnapshotRestoreHome: React.FunctionComponent<Props> = ({
  match: {
    params: { section },
  },
  history,
}) => {
  const [activeSection, setActiveSection] = useState<Section>(section);

  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();

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

  const onSectionChange = (newSection: Section) => {
    setActiveSection(newSection);
    history.push(`${BASE_PATH}/${newSection}`);
  };

  // Set breadcrumb
  useEffect(() => {
    breadcrumbService.setBreadcrumbs('home');
  }, []);

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
              onClick={() => onSectionChange(tab.id)}
              isSelected={tab.id === activeSection}
              key={tab.id}
              data-test-subject={tab.testSubj}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>

        <EuiSpacer size="m" />

        <Switch>
          <Route exact path={`${BASE_PATH}/repositories/:name*`} component={RepositoryList} />
          <Route exact path={`${BASE_PATH}/snapshots/:name*`} component={SnapshotList} />
        </Switch>
      </EuiPageContent>
    </EuiPageBody>
  );
};
