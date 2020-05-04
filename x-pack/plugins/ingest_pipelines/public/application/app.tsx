/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPageContent, EuiCode } from '@elastic/eui';
import React, { FunctionComponent } from 'react';
import { HashRouter, Switch, Route } from 'react-router-dom';

import { BASE_PATH, APP_CLUSTER_REQUIRED_PRIVILEGES } from '../../common/constants';

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
    <Route exact path={BASE_PATH} component={PipelinesList} />
    <Route exact path={`${BASE_PATH}/create/:sourceName`} component={PipelinesClone} />
    <Route exact path={`${BASE_PATH}/create`} component={PipelinesCreate} />
    <Route exact path={`${BASE_PATH}/edit/:name`} component={PipelinesEdit} />
    {/* Catch all */}
    <Route component={PipelinesList} />
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
    <WithPrivileges
      privileges={APP_CLUSTER_REQUIRED_PRIVILEGES.map(privilege => `cluster.${privilege}`)}
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
                    defaultMessage="You must have the {missingPrivileges} {privilegesCount,
                    plural, one {privilege} other {privileges}} to access Ingest Node Pipelines."
                    values={{
                      missingPrivileges: privilegesMissing
                        .cluster!.map(privilege => <EuiCode>{privilege}</EuiCode>)
                        .reduce((acc, currPrivilege, idx) => {
                          if (idx === 0) {
                            return currPrivilege;
                          }
                          return (
                            <>
                              {acc}{' '}
                              <FormattedMessage
                                id="xpack.ingestPipelines.app.deniedPrivilegeAndLabel"
                                defaultMessage="and"
                              />{' '}
                              {currPrivilege}
                            </>
                          );
                        }),
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
