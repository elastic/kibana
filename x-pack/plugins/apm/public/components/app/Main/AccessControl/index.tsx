/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { STATUS } from '../../../../constants/index';
import { LicenceRequest } from '../../../../store/reactReduxRequest/license';
import { ServerStatusCheck } from '../../../../store/reactReduxRequest/serverStatusCheck';
import { InvalidLicenseNotification } from './InvalidLicenseNotification';
import { UpgradeAPMServerNotification } from './UpgradeAPMServerNotification';

export const AccessControl: React.SFC = ({ children }) => {
  // First check the Elastic license status
  return (
    <LicenceRequest
      render={({ data: licenseData, status: licenseStatus }) => {
        if (!licenseStatus || licenseStatus === STATUS.LOADING) {
          return null;
        }
        if (
          licenseStatus === STATUS.SUCCESS &&
          !licenseData.license.is_active
        ) {
          return <InvalidLicenseNotification />;
        }

        // Next check if APM Server is in the correct state
        return (
          <ServerStatusCheck
            render={({ data: serverData, status: serverStatus }) => {
              if (!serverStatus || serverStatus === STATUS.LOADING) {
                return null;
              }

              if (
                serverStatus === STATUS.SUCCESS &&
                serverData.latest &&
                serverData.latest.observer.version_major < 7
              ) {
                return (
                  <UpgradeAPMServerNotification
                    version={serverData.latest.observer.version}
                  />
                );
              }
              return children;
            }}
          />
        );
      }}
    />
  );
};
