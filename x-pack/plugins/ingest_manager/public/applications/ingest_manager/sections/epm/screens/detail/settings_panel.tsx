/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiTitle, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { useGetPackageInstallStatus } from '../../hooks';
import { InstallStatus, PackageInfo } from '../../../../types';
import { InstallationButton } from './installation_button';

export const SettingsPanel = (
  props: Pick<PackageInfo, 'assets' | 'name' | 'title' | 'version'>
) => {
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const { name, title } = props;
  const packageInstallStatus = getPackageInstallStatus(name);

  return (
    <EuiText>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.ingestManager.integrations.settings.packageSettingsTitle"
            defaultMessage="Settings"
          />
        </h3>
      </EuiTitle>
      {packageInstallStatus === InstallStatus.notInstalled ||
      packageInstallStatus === InstallStatus.installing ? (
        <Fragment>
          <h4>
            <FormattedMessage
              id="xpack.ingestManager.integrations.settings.packageInstallTitle"
              defaultMessage="Install {title}"
              values={{
                title,
              }}
            />
          </h4>
          <p>
            <FormattedMessage
              id="xpack.ingestManager.integrations.settings.packageInstallDescription"
              defaultMessage="Install this integration to setup Kibana and Elasticsearch assets designed for Nginx data."
            />
          </p>
        </Fragment>
      ) : (
        <Fragment>
          <h4>
            <FormattedMessage
              id="xpack.ingestManager.integrations.settings.packageUninstallTitle"
              defaultMessage="Uninstall {title}"
              values={{
                title,
              }}
            />
          </h4>
          <p>
            <FormattedMessage
              id="xpack.ingestManager.integrations.settings.packageUninstallDescription"
              defaultMessage="Remove Kibana and Elasticsearch assets that were installed by this Integration."
            />
          </p>
        </Fragment>
      )}
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <InstallationButton {...props} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiText>
  );
};
