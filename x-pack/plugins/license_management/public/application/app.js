/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { LicenseDashboard, UploadLicense } from './sections';
import { Switch, Route } from 'react-router-dom';
import { APP_PERMISSION } from '../../common/constants';
import { SectionLoading, useExecutionContext } from '../shared_imports';
import { EuiPageContent, EuiPageBody, EuiEmptyPrompt } from '@elastic/eui';

export const App = ({
  hasPermission,
  permissionsLoading,
  permissionsError,
  telemetry,
  loadPermissions,
  executionContext,
}) => {
  useExecutionContext(executionContext, {
    type: 'application',
    page: 'licenseManagement',
  });

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  if (permissionsLoading) {
    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
        <SectionLoading>
          <FormattedMessage
            id="xpack.licenseMgmt.app.loadingPermissionsDescription"
            defaultMessage="Checking permissions…"
          />
        </SectionLoading>
      </EuiPageContent>
    );
  }

  if (permissionsError) {
    const error = permissionsError?.data?.message;

    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="danger">
        <EuiEmptyPrompt
          iconType="alert"
          title={
            <h1>
              <FormattedMessage
                id="xpack.licenseMgmt.app.checkingPermissionsErrorMessage"
                defaultMessage="Error checking permissions"
              />
            </h1>
          }
          body={error ? <p>{error}</p> : null}
        />
      </EuiPageContent>
    );
  }

  if (!hasPermission) {
    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
        <EuiEmptyPrompt
          iconType="securityApp"
          title={
            <h1>
              <FormattedMessage
                id="xpack.licenseMgmt.app.deniedPermissionTitle"
                defaultMessage="Cluster privileges required"
              />
            </h1>
          }
          body={
            <p>
              <FormattedMessage
                id="xpack.licenseMgmt.app.deniedPermissionDescription"
                defaultMessage="To use License Management, you must have {permissionType} privileges."
                values={{
                  permissionType: <strong>{APP_PERMISSION}</strong>,
                }}
              />
            </p>
          }
        />
      </EuiPageContent>
    );
  }

  const withTelemetry = (Component) => (props) => <Component {...props} telemetry={telemetry} />;
  return (
    <EuiPageBody>
      <Switch>
        <Route path={`/upload_license`} component={withTelemetry(UploadLicense)} />
        <Route path={['/']} component={withTelemetry(LicenseDashboard)} />
      </Switch>
    </EuiPageBody>
  );
};
