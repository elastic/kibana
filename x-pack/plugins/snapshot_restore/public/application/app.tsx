/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { EuiPageContent } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { APP_WRAPPER_CLASS } from '../../../../../src/core/public';

import { APP_REQUIRED_CLUSTER_PRIVILEGES } from '../../common';
import {
  useAuthorizationContext,
  PageError,
  WithPrivileges,
  NotAuthorizedSection,
} from '../shared_imports';
import { PageLoading } from './components';
import { DEFAULT_SECTION, Section } from './constants';
import {
  RepositoryAdd,
  RepositoryEdit,
  RestoreSnapshot,
  SnapshotRestoreHome,
  PolicyAdd,
  PolicyEdit,
} from './sections';
import { useConfig } from './app_context';

export const App: React.FunctionComponent = () => {
  const { slm_ui: slmUi } = useConfig();
  const { apiError } = useAuthorizationContext();

  const sections: Section[] = ['repositories', 'snapshots', 'restore_status'];

  if (slmUi.enabled) {
    sections.push('policies' as Section);
  }

  const sectionsRegex = sections.join('|');

  return apiError ? (
    <PageError
      title={
        <FormattedMessage
          id="xpack.snapshotRestore.app.checkingPrivilegesErrorMessage"
          defaultMessage="Error fetching user privileges from the server."
        />
      }
      error={apiError}
    />
  ) : (
    <WithPrivileges privileges={APP_REQUIRED_CLUSTER_PRIVILEGES.map((name) => `cluster.${name}`)}>
      {({ isLoading, hasPrivileges, privilegesMissing }) =>
        isLoading ? (
          <PageLoading>
            <FormattedMessage
              id="xpack.snapshotRestore.app.checkingPrivilegesDescription"
              defaultMessage="Checking privileges…"
            />
          </PageLoading>
        ) : hasPrivileges ? (
          <div data-test-subj="snapshotRestoreApp" className={APP_WRAPPER_CLASS}>
            <Switch>
              <Route exact path="/add_repository" component={RepositoryAdd} />
              <Route exact path="/edit_repository/:name*" component={RepositoryEdit} />
              <Route
                exact
                path={`/:section(${sectionsRegex})/:repositoryName?/:snapshotId*`}
                component={SnapshotRestoreHome}
              />
              <Redirect exact from="/restore/:repositoryName" to="/snapshots" />
              <Route
                exact
                path="/restore/:repositoryName/:snapshotId*"
                component={RestoreSnapshot}
              />
              {slmUi.enabled && <Route exact path="/add_policy" component={PolicyAdd} />}
              {slmUi.enabled && <Route exact path="/edit_policy/:name*" component={PolicyEdit} />}
              <Redirect from="/" to={`/${DEFAULT_SECTION}`} />
              <Redirect from="" to={`/${DEFAULT_SECTION}`} />
            </Switch>
          </div>
        ) : (
          <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
            <NotAuthorizedSection
              title={
                <FormattedMessage
                  id="xpack.snapshotRestore.app.deniedPrivilegeTitle"
                  defaultMessage="You're missing cluster privileges"
                />
              }
              message={
                <FormattedMessage
                  id="xpack.snapshotRestore.app.deniedPrivilegeDescription"
                  defaultMessage="To use Snapshot and Restore, you must have {privilegesCount,
                    plural, one {this cluster privilege} other {these cluster privileges}}: {missingPrivileges}."
                  values={{
                    missingPrivileges: privilegesMissing.cluster!.join(', '),
                    privilegesCount: privilegesMissing.cluster!.length,
                  }}
                />
              }
            />
          </EuiPageContent>
        )
      }
    </WithPrivileges>
  );
};
