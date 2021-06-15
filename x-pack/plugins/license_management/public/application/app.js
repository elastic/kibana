/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { LicenseDashboard, UploadLicense } from './sections';
import { Switch, Route } from 'react-router-dom';
import { APP_PERMISSION } from '../../common/constants';
import { SectionLoading } from '../shared_imports';
import { EuiPageContent, EuiPageBody, EuiEmptyPrompt } from '@elastic/eui';

export class App extends Component {
  componentDidMount() {
    const { loadPermissions } = this.props;
    loadPermissions();
  }

  render() {
    const { hasPermission, permissionsLoading, permissionsError, telemetry } = this.props;

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
      return (
        <EuiPageContent verticalPosition="center" horizontalPosition="center" color="danger">
          <EuiEmptyPrompt
            iconType="alert"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.licenseMgmt.app.checkingPermissionsErrorMessage"
                  defaultMessage="Error checking permissions"
                />
              </h2>
            }
            body={<p>{permissionsError?.data?.message}</p>}
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
              <h2>
                <FormattedMessage
                  id="xpack.licenseMgmt.app.deniedPermissionTitle"
                  defaultMessage="Cluster privileges required"
                />
              </h2>
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
  }
}
