/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { Route, RouteComponentProps, Switch } from 'react-router-dom';

import { EuiButtonEmpty, EuiPageHeader, EuiSpacer } from '@elastic/eui';

import { BASE_PATH, Section } from '../../constants';
import { useConfig, useCore } from '../../app_context';
import { breadcrumbService, docTitleService } from '../../services/navigation';

import { RepositoryList } from './repository_list';
import { SnapshotList } from './snapshot_list';
import { RestoreList } from './restore_list';
import { PolicyList } from './policy_list';

interface MatchParams {
  section: Section;
}

export const SnapshotRestoreHome: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { section },
  },
  history,
}) => {
  const { slm_ui: slmUi } = useConfig();
  const { docLinks } = useCore();

  const tabs: Array<{
    id: Section;
    name: React.ReactNode;
  }> = [
    {
      id: 'snapshots',
      name: (
        <FormattedMessage
          id="xpack.snapshotRestore.home.snapshotsTabTitle"
          defaultMessage="Snapshots"
        />
      ),
    },
    {
      id: 'repositories',
      name: (
        <FormattedMessage
          id="xpack.snapshotRestore.home.repositoriesTabTitle"
          defaultMessage="Repositories"
        />
      ),
    },
    {
      id: 'restore_status',
      name: (
        <FormattedMessage
          id="xpack.snapshotRestore.home.restoreTabTitle"
          defaultMessage="Restore Status"
        />
      ),
    },
  ];

  if (slmUi.enabled) {
    tabs.splice(2, 0, {
      id: 'policies',
      name: (
        <FormattedMessage
          id="xpack.snapshotRestore.home.policiesTabTitle"
          defaultMessage="Policies"
        />
      ),
    });
  }

  const onSectionChange = (newSection: Section) => {
    history.push(encodeURI(`${BASE_PATH}/${encodeURIComponent(newSection)}`));
  };

  // Set breadcrumb and page title
  useEffect(() => {
    breadcrumbService.setBreadcrumbs(section || 'home');
    docTitleService.setTitle(section || 'home');
  }, [section]);

  return (
    <>
      <EuiPageHeader
        bottomBorder
        pageTitle={
          <span data-test-subj="appTitle">
            <FormattedMessage
              id="xpack.snapshotRestore.home.snapshotRestoreTitle"
              defaultMessage="Snapshot and Restore"
            />
          </span>
        }
        rightSideItems={[
          <EuiButtonEmpty
            href={docLinks.links.snapshotRestore.guide}
            target="_blank"
            iconType="help"
            data-test-subj="documentationLink"
          >
            <FormattedMessage
              id="xpack.snapshotRestore.home.snapshotRestoreDocsLinkText"
              defaultMessage="Snapshot and Restore docs"
            />
          </EuiButtonEmpty>,
        ]}
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.home.snapshotRestoreDescription"
            defaultMessage="Use repositories to store and recover backups of your Elasticsearch indices and clusters."
          />
        }
        tabs={tabs.map((tab) => ({
          onClick: () => onSectionChange(tab.id),
          isSelected: tab.id === section,
          key: tab.id,
          'data-test-subj': tab.id.toLowerCase() + '_tab',
          label: tab.name,
        }))}
      />

      <EuiSpacer size="l" />

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
        <Route exact path={`${BASE_PATH}/restore_status`} component={RestoreList} />
        <Route exact path={`${BASE_PATH}/policies/:policyName*`} component={PolicyList} />
      </Switch>
    </>
  );
};
