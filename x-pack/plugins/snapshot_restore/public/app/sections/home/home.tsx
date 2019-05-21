/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { Route, RouteComponentProps, Switch } from 'react-router-dom';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageBody,
  EuiPageContent,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
  EuiText,
} from '@elastic/eui';

import { BASE_PATH, Section } from '../../constants';
import { useAppDependencies } from '../../index';
import { breadcrumbService } from '../../services/navigation';

import { RepositoryList } from './repository_list';
import { SnapshotList } from './snapshot_list';
import { documentationLinksService } from '../../services/documentation';

interface MatchParams {
  section: Section;
}

export const SnapshotRestoreHome: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { section },
  },
  history,
}) => {
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
    },
    {
      id: 'repositories' as Section,
      name: (
        <FormattedMessage
          id="xpack.snapshotRestore.home.repositoriesTabTitle"
          defaultMessage="Repositories"
        />
      ),
    },
  ];

  const onSectionChange = (newSection: Section) => {
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
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={true}>
              <h1 data-test-subj="appTitle">
                <FormattedMessage
                  id="xpack.snapshotRestore.home.snapshotRestoreTitle"
                  defaultMessage="Snapshot Repositories"
                />
              </h1>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                href={documentationLinksService.getRepositoryTypeDocUrl()}
                target="_blank"
                iconType="help"
                data-test-subj="documentationLink"
              >
                <FormattedMessage
                  id="xpack.snapshotRestore.home.snapshotRestoreDocsLinkText"
                  defaultMessage="Snapshot docs"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiTitle size="s">
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.snapshotRestore.home.snapshotRestoreDescription"
              defaultMessage="Use repositories to store backups of your Elasticsearch indices and clusters."
            />
          </EuiText>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiTabs>
          {tabs.map(tab => (
            <EuiTab
              onClick={() => onSectionChange(tab.id)}
              isSelected={tab.id === section}
              key={tab.id}
              data-test-subj="tab"
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>

        <EuiSpacer size="m" />

        <Switch>
          <Route
            exact
            path={`${BASE_PATH}/repositories/:repositoryName*`}
            component={RepositoryList}
          />
          {/* We have two separate SnapshotList routes because repository names could have slashes in
           *  them. This would break a route with a path like snapshots/:repositoryName?/:snapshotId*
           */}
          <Route exact path={`${BASE_PATH}/snapshots`} component={SnapshotList} />
          <Route
            exact
            path={`${BASE_PATH}/snapshots/:repositoryName*/:snapshotId`}
            component={SnapshotList}
          />
        </Switch>
      </EuiPageContent>
    </EuiPageBody>
  );
};
