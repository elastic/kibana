/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiTitle, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import styled from 'styled-components';
import { InstallStatus, PackageInfo } from '../../../../types';
import { useGetPackagePolicies } from '../../../../hooks';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../constants';
import { useGetPackageInstallStatus } from '../../hooks';
import { InstallationButton } from './installation_button';
import { UpdateIcon } from '../../components/icons';

const SettingsTitleCell = styled.td`
  padding-right: ${(props) => props.theme.eui.spacerSizes.xl};
  padding-bottom: ${(props) => props.theme.eui.spacerSizes.m};
`;

const UpdatesAvailableMsgContainer = styled.span`
  padding-left: ${(props) => props.theme.eui.spacerSizes.s};
`;

const NoteLabel = () => (
  <FormattedMessage
    id="xpack.ingestManager.integrations.settings.packageUninstallNoteDescription.packageUninstallNoteLabel"
    defaultMessage="Note:"
  />
);
const UpdatesAvailableMsg = () => (
  <UpdatesAvailableMsgContainer>
    <UpdateIcon size="l" />
    <FormattedMessage
      id="xpack.ingestManager.integrations.settings.versionInfo.updatesAvailable"
      defaultMessage="Updates are available"
    />
  </UpdatesAvailableMsgContainer>
);

export const SettingsPanel = (
  props: Pick<PackageInfo, 'assets' | 'name' | 'title' | 'version' | 'removable' | 'latestVersion'>
) => {
  const { name, title, removable, latestVersion, version } = props;
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const { data: packagePoliciesData } = useGetPackagePolicies({
    perPage: 0,
    page: 1,
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${props.name}`,
  });
  const { status: installationStatus, version: installedVersion } = getPackageInstallStatus(name);
  const packageHasUsages = !!packagePoliciesData?.total;
  const updateAvailable = installedVersion && installedVersion < latestVersion ? true : false;
  const isViewingOldPackage = version < latestVersion;
  // hide install/remove options if the user has version of the package is installed
  // and this package is out of date or if they do have a version installed but it's not this one
  const hideInstallOptions =
    (installationStatus === InstallStatus.notInstalled && isViewingOldPackage) ||
    (installationStatus === InstallStatus.installed && installedVersion !== version);

  const isUpdating = installationStatus === InstallStatus.installing && installedVersion;
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
      {installedVersion !== null && (
        <div>
          <EuiTitle>
            <h4>
              <FormattedMessage
                id="xpack.ingestManager.integrations.settings.packageVersionTitle"
                defaultMessage="{title} version"
                values={{
                  title,
                }}
              />
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <table>
            <tbody>
              <tr>
                <SettingsTitleCell>
                  <FormattedMessage
                    id="xpack.ingestManager.integrations.settings.versionInfo.installedVersion"
                    defaultMessage="Installed version"
                  />
                </SettingsTitleCell>
                <td>
                  <EuiTitle size="xs">
                    <span>{installedVersion}</span>
                  </EuiTitle>
                  {updateAvailable && <UpdatesAvailableMsg />}
                </td>
              </tr>
              <tr>
                <SettingsTitleCell>
                  <FormattedMessage
                    id="xpack.ingestManager.integrations.settings.versionInfo.latestVersion"
                    defaultMessage="Latest version"
                  />
                </SettingsTitleCell>
                <td>
                  <EuiTitle size="xs">
                    <span>{latestVersion}</span>
                  </EuiTitle>
                </td>
              </tr>
            </tbody>
          </table>
          {updateAvailable && (
            <p>
              <InstallationButton
                {...props}
                version={latestVersion}
                disabled={false}
                isUpdate={true}
              />
            </p>
          )}
        </div>
      )}
      {!hideInstallOptions && !isUpdating && (
        <div>
          <EuiSpacer size="s" />
          {installationStatus === InstallStatus.notInstalled ||
          installationStatus === InstallStatus.installing ? (
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
                  defaultMessage="Remove Kibana and Elasticsearch assets that were installed by this integration."
                />
              </p>
            </div>
          )}
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <p>
                <InstallationButton
                  {...props}
                  disabled={!packagePoliciesData || removable === false ? true : packageHasUsages}
                />
              </p>
            </EuiFlexItem>
          </EuiFlexGroup>
          {packageHasUsages && removable === true && (
            <p>
              <FormattedMessage
                id="xpack.ingestManager.integrations.settings.packageUninstallNoteDescription.packageUninstallNoteDetail"
                defaultMessage="{strongNote} {title} cannot be uninstalled because there are active agents that use this integration. To uninstall, remove all {title} integrations from your agent policies."
                values={{
                  title,
                  strongNote: (
                    <strong>
                      <NoteLabel />
                    </strong>
                  ),
                }}
              />
            </p>
          )}
          {removable === false && (
            <p>
              <FormattedMessage
                id="xpack.ingestManager.integrations.settings.packageUninstallNoteDescription.packageUninstallUninstallableNoteDetail"
                defaultMessage="{strongNote} The {title} integration is installed by default and cannot be removed."
                values={{
                  title,
                  strongNote: (
                    <strong>
                      <NoteLabel />
                    </strong>
                  ),
                }}
              />
            </p>
          )}
        </div>
      )}
    </EuiText>
  );
};
