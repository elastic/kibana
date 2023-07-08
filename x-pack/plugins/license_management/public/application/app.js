/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FormattedMessage } from '@kbn/i18n-react';
import { LicenseDashboard, UploadLicense } from './sections';
import { Routes, Route } from '@kbn/shared-ux-router';
import { APP_PERMISSION } from '../../common/constants';
import { SectionLoading, useExecutionContext } from '../shared_imports';
import {
  EuiPageContent_Deprecated as EuiPageContent,
  EuiPageBody,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { UPLOAD_LICENSE_ROUTE } from '../locator';
import {
  getPermission,
  isPermissionsLoading,
  getPermissionsError,
} from './store/reducers/license_management';
import { loadPermissions as loadPermissionsAction } from './store/actions/permissions';

export const App = ({ telemetry, executionContext }) => {
  const hasPermission = useSelector(getPermission);
  const permissionsLoading = useSelector(isPermissionsLoading);
  const permissionsError = useSelector(getPermissionsError);

  const dispatch = useDispatch();
  const loadPermissions = useCallback(() => dispatch(loadPermissionsAction), [dispatch]);

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
          iconType="warning"
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
      <Routes>
        <Route path={`/${UPLOAD_LICENSE_ROUTE}`} component={withTelemetry(UploadLicense)} />
        <Route path={'/'} component={withTelemetry(LicenseDashboard)} />
      </Routes>
    </EuiPageBody>
  );
};
