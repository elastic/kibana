/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPageContent } from '@elastic/eui';
import React, { FunctionComponent } from 'react';
import { HashRouter, Switch, Route } from 'react-router-dom';

import { BASE_PATH, APP_REQUIRED_PRIVILEGE } from '../../common/constants';

import {
  SectionError,
  useAuthorizationContext,
  WithPrivileges,
  SectionLoading,
  NotAuthorizedSection,
} from '../shared_imports';

import { PipelinesList, PipelinesCreate, PipelinesEdit } from './sections';

export const AppWithoutRouter = () => (
  <Switch>
    <Route exact path={BASE_PATH} component={PipelinesList} />
    <Route exact path={`${BASE_PATH}/create`} component={PipelinesCreate} />
    <Route exact path={`${BASE_PATH}/edit/:name`} component={PipelinesEdit} />
  </Switch>
);

export const App: FunctionComponent = () => {
  const { apiError } = useAuthorizationContext();

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
    <WithPrivileges privileges={[`cluster.${APP_REQUIRED_PRIVILEGE}`]}>
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
          );
        }

        return (
          <HashRouter>
            <AppWithoutRouter />
          </HashRouter>
        );
      }}
    </WithPrivileges>
  );
};
