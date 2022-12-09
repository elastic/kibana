/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { EuiPageContent_Deprecated as EuiPageContent } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { APP_WRAPPER_CLASS } from '@kbn/core/public';

import { APP_REQUIRED_CLUSTER_PRIVILEGES } from '../../common';
import {
  useAuthorizationContext,
  PageError,
  WithPrivileges,
  NotAuthorizedSection,
  useExecutionContext,
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
import { useAppContext, useConfig } from './app_context';

export const App: React.FunctionComponent = () => {
  const { slm_ui: slmUi } = useConfig();
  const { apiError } = useAuthorizationContext();
  const { core } = useAppContext();

  const sections: Section[] = ['repositories', 'snapshots', 'restore_status'];

  if (slmUi.enabled) {
    sections.push('policies' as Section);
  }

  const sectionsRegex = sections.join('|');

  useExecutionContext(core.executionContext, {
    type: 'application',
    page: 'snapshotRestore',
  });

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
            <Routes>
              <Route path="/add_repository" element={RepositoryAdd} />
              <Route path="/edit_repository/:name*" element={RepositoryEdit} />
              <Route
                path={`/:section(${sectionsRegex})/:repositoryName?/:snapshotId*`}
                children={SnapshotRestoreHome}
              />
              <Route path="/restore/:repositoryName" element={<Navigate to="/snapshots" />} />
              <Route path="/restore/:repositoryName/:snapshotId*" element={RestoreSnapshot} />
              {slmUi.enabled && <Route path="/add_policy" element={PolicyAdd} />}
              {slmUi.enabled && <Route path="/edit_policy/:name*" element={PolicyEdit} />}
              {['/', ''].map((path) => (
                <Route path={path} element={<Navigate to={`/${DEFAULT_SECTION}`} />} />
              ))}
            </Routes>
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
