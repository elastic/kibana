/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPageContent_Deprecated as EuiPageContent, EuiEmptyPrompt } from '@elastic/eui';
import React, { FunctionComponent } from 'react';
import { Router, Routes, Route } from 'react-router-dom';

import { useKibana, useExecutionContext } from '../shared_imports';

import { APP_CLUSTER_REQUIRED_PRIVILEGES } from '../../common/constants';

import {
  SectionError,
  useAuthorizationContext,
  WithPrivileges,
  SectionLoading,
} from '../shared_imports';

import {
  PipelinesList,
  PipelinesCreate,
  PipelinesEdit,
  PipelinesClone,
  PipelinesCreateFromCsv,
} from './sections';
import { ROUTES } from './services/navigation';

export const AppWithoutRouter = () => (
  <Routes>
    <Route path={ROUTES.list} element={PipelinesList} />
    <Route path={ROUTES.clone} element={PipelinesClone} />
    <Route path={ROUTES.create} element={PipelinesCreate} />
    <Route path={ROUTES.edit} element={PipelinesEdit} />
    <Route path={ROUTES.createFromCsv} element={PipelinesCreateFromCsv} />
    {/* Catch all */}
    <Route element={PipelinesList} />
  </Routes>
);

export const App: FunctionComponent = () => {
  const { apiError } = useAuthorizationContext();
  const { history, executionContext } = useKibana().services;

  useExecutionContext(executionContext!, {
    type: 'application',
    page: 'ingestPipelines',
  });

  if (apiError) {
    return (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.ingestPipelines.app.checkingPrivilegesErrorMessage"
            defaultMessage="Error fetching user privileges from the server."
          />
        }
        error={apiError}
      />
    );
  }

  return (
    <WithPrivileges
      privileges={APP_CLUSTER_REQUIRED_PRIVILEGES.map((privilege) => `cluster.${privilege}`)}
    >
      {({ isLoading, hasPrivileges, privilegesMissing }) => {
        if (isLoading) {
          return (
            <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
              <SectionLoading>
                <FormattedMessage
                  id="xpack.ingestPipelines.app.checkingPrivilegesDescription"
                  defaultMessage="Checking privileges…"
                />
              </SectionLoading>
            </EuiPageContent>
          );
        }

        if (!hasPrivileges) {
          return (
            <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
              <EuiEmptyPrompt
                iconType="securityApp"
                title={
                  <h2>
                    <FormattedMessage
                      id="xpack.ingestPipelines.app.deniedPrivilegeTitle"
                      defaultMessage="Cluster privileges required"
                    />
                  </h2>
                }
                body={
                  <p>
                    <FormattedMessage
                      id="xpack.ingestPipelines.app.deniedPrivilegeDescription"
                      defaultMessage="To use Ingest Pipelines, you must have {privilegesCount,
                      plural, one {this cluster privilege} other {these cluster privileges}}: {missingPrivileges}."
                      values={{
                        missingPrivileges: privilegesMissing.cluster!.join(', '),
                        privilegesCount: privilegesMissing.cluster!.length,
                      }}
                    />
                  </p>
                }
              />
            </EuiPageContent>
          );
        }

        return (
          <Router navigator={history} location={history.location}>
            <AppWithoutRouter />
          </Router>
        );
      }}
    </WithPrivileges>
  );
};
