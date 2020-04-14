/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiTitle, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { useGetPackageInstallStatus } from '../../hooks';
import { InstallStatus, PackageInfo } from '../../../../types';
import { InstallationButton } from './installation_button';
import { useGetDatasources } from '../../../../hooks';

export const SettingsPanel = (
  props: Pick<PackageInfo, 'assets' | 'name' | 'title' | 'version'>
) => {
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const { data: datasourcesData } = useGetDatasources({
    perPage: 0,
    page: 1,
    kuery: `datasources.package.name:${props.name}`,
  });
  const { name, title } = props;
  const packageInstallStatus = getPackageInstallStatus(name);
  const packageHasDatasources = !!datasourcesData?.total;

  return (
    <EuiText>
      <EuiTitle>
        <h3>
          <FormattedMessage
            id="xpack.ingestManager.integrations.settings.packageSettingsTitle"
            defaultMessage="Settings"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      {packageInstallStatus === InstallStatus.notInstalled ||
      packageInstallStatus === InstallStatus.installing ? (
        <div>
          <EuiTitle>
            <h4>
              <FormattedMessage
                id="xpack.ingestManager.integrations.settings.packageInstallTitle"
                defaultMessage="Install {title}"
                values={{
                  title,
                }}
              />
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <p>
            <FormattedMessage
              id="xpack.ingestManager.integrations.settings.packageInstallDescription"
              defaultMessage="Install this integration to setup Kibana and Elasticsearch assets designed for {title} data."
              values={{
                title,
              }}
            />
          </p>
        </div>
      ) : (
        <div>
          <EuiTitle>
            <h4>
              <FormattedMessage
                id="xpack.ingestManager.integrations.settings.packageUninstallTitle"
                defaultMessage="Uninstall {title}"
                values={{
                  title,
                }}
              />
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <p>
            <FormattedMessage
              id="xpack.ingestManager.integrations.settings.packageUninstallDescription"
              defaultMessage="Remove Kibana and Elasticsearch assets that were installed by this Integration."
            />
          </p>
        </div>
      )}
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <p>
            <InstallationButton
              {...props}
              disabled={!datasourcesData ? true : packageHasDatasources}
            />
          </p>
        </EuiFlexItem>
      </EuiFlexGroup>
      {packageHasDatasources && (
        <p>
          <FormattedMessage
            id="xpack.ingestManager.integrations.settings.packageUninstallNoteDescription.packageUninstallNoteDetail"
            defaultMessage="{strongNote} {title} cannot be uninstalled because there are active agents that use this integration. To uninstall, remove all {title} data sources from your agent configurations."
            values={{
              title,
              strongNote: (
                <strong>
                  <FormattedMessage
                    id="xpack.ingestManager.integrations.settings.packageUninstallNoteDescription.packageUninstallNoteLabel"
                    defaultMessage="Note:"
                  />
                </strong>
              ),
            }}
          />
        </p>
      )}
    </EuiText>
  );
};
