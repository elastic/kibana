/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPageContent } from '@elastic/eui';
import React, { FunctionComponent } from 'react';
import { Router, Switch, Route } from 'react-router-dom';

import { useKibana } from '../shared_imports';

import { APP_CLUSTER_REQUIRED_PRIVILEGES } from '../../common/constants';

import {
  SectionError,
  useAuthorizationContext,
  WithPrivileges,
  SectionLoading,
  NotAuthorizedSection,
} from '../shared_imports';

import { PipelinesList, PipelinesCreate, PipelinesEdit, PipelinesClone } from './sections';

export const AppWithoutRouter = () => (
  <Switch>
    <Route exact path="/" component={PipelinesList} />
    <Route exact path={`/create/:sourceName`} component={PipelinesClone} />
    <Route exact path={`/create`} component={PipelinesCreate} />
    <Route exact path={`/edit/:name`} component={PipelinesEdit} />
    {/* Catch all */}
    <Route component={PipelinesList} />
  </Switch>
);

export const App: FunctionComponent = () => {
  const { apiError } = useAuthorizationContext();
  const { history } = useKibana().services;

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
            <SectionLoading>
              <FormattedMessage
                id="xpack.ingestPipelines.app.checkingPrivilegesDescription"
                defaultMessage="Checking privileges…"
              />
            </SectionLoading>
          );
        }

        if (!hasPrivileges) {
          return (
            <EuiPageContent>
              <NotAuthorizedSection
                title={
                  <FormattedMessage
                    id="xpack.ingestPipelines.app.deniedPrivilegeTitle"
                    defaultMessage="Cluster privileges required"
                  />
                }
                message={
                  <FormattedMessage
                    id="xpack.ingestPipelines.app.deniedPrivilegeDescription"
                    defaultMessage="To use Ingest Pipelines, you must have {privilegesCount,
                    plural, one {this cluster privilege} other {these cluster privileges}}: {missingPrivileges}."
                    values={{
                      missingPrivileges: privilegesMissing.cluster!.join(', '),
                      privilegesCount: privilegesMissing.cluster!.length,
                    }}
                  />
                }
              />
            </EuiPageContent>
          );
        }

        return (
          <Router history={history}>
            <AppWithoutRouter />
          </Router>
        );
      }}
    </WithPrivileges>
  );
};
