/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n/react';
import semverLt from 'semver/functions/lt';

import { EuiTitle, EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer } from '@elastic/eui';

import type { PackageInfo } from '../../../../../types';
import { InstallStatus } from '../../../../../types';
import { useGetPackagePolicies } from '../../../../../hooks';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../../constants';
import { useGetPackageInstallStatus } from '../../../hooks';
import { UpdateIcon } from '../components';

import { InstallationButton } from './installation_button';

const SettingsTitleCell = styled.td`
  padding-right: ${(props) => props.theme.eui.spacerSizes.xl};
  padding-bottom: ${(props) => props.theme.eui.spacerSizes.m};
`;

const UpdatesAvailableMsgContainer = styled.span`
  padding-left: ${(props) => props.theme.eui.spacerSizes.s};
`;

const NoteLabel = () => (
  <strong>
    <FormattedMessage
      id="xpack.fleet.integrations.settings.packageUninstallNoteDescription.packageUninstallNoteLabel"
      defaultMessage="Note:"
    />
  </strong>
);
const UpdatesAvailableMsg = () => (
  <UpdatesAvailableMsgContainer>
    <UpdateIcon size="l" />
    <FormattedMessage
      id="xpack.fleet.integrations.settings.versionInfo.updatesAvailable"
      defaultMessage="Updates are available"
    />
  </UpdatesAvailableMsgContainer>
);

interface Props {
  packageInfo: PackageInfo;
}

export const SettingsPage: React.FC<Props> = memo(({ packageInfo }: Props) => {
  const { name, title, removable, latestVersion, version } = packageInfo;
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const { data: packagePoliciesData } = useGetPackagePolicies({
    perPage: 0,
    page: 1,
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${name}`,
  });
  const { status: installationStatus, version: installedVersion } = getPackageInstallStatus(name);
  const packageHasUsages = !!packagePoliciesData?.total;
  const updateAvailable =
    installedVersion && semverLt(installedVersion, latestVersion) ? true : false;

  const isViewingOldPackage = version < latestVersion;
  // hide install/remove options if the user has version of the package is installed
  // and this package is out of date or if they do have a version installed but it's not this one
  const hideInstallOptions =
    (installationStatus === InstallStatus.notInstalled && isViewingOldPackage) ||
    (installationStatus === InstallStatus.installed && installedVersion !== version);

  const isUpdating = installationStatus === InstallStatus.installing && installedVersion;
  return (
    <EuiFlexGroup alignItems="flexStart">
      <EuiFlexItem grow={1} />
      <EuiFlexItem grow={6}>
        <EuiText>
          <EuiTitle>
            <h3>
              <FormattedMessage
                id="xpack.fleet.integrations.settings.packageSettingsTitle"
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
                    id="xpack.fleet.integrations.settings.packageVersionTitle"
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
                        id="xpack.fleet.integrations.settings.versionInfo.installedVersion"
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
                        id="xpack.fleet.integrations.settings.versionInfo.latestVersion"
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
                    {...packageInfo}
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
                        id="xpack.fleet.integrations.settings.packageInstallTitle"
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
                      id="xpack.fleet.integrations.settings.packageInstallDescription"
                      defaultMessage="Install this integration to setup Kibana and Elasticsearch assets designed for {title} data."
                      values={{
                        title,
                      }}
                    />
                  </p>
                </div>
              ) : (
                removable && (
                  <>
                    <div>
                      <EuiTitle>
                        <h4>
                          <FormattedMessage
                            id="xpack.fleet.integrations.settings.packageUninstallTitle"
                            defaultMessage="Uninstall"
                          />
                        </h4>
                      </EuiTitle>
                      <EuiSpacer size="s" />
                      <p>
                        <FormattedMessage
                          id="xpack.fleet.integrations.settings.packageUninstallDescription"
                          defaultMessage="Remove Kibana and Elasticsearch assets that were installed by this integration."
                        />
                      </p>
                    </div>
                    <EuiFlexGroup>
                      <EuiFlexItem grow={false}>
                        <p>
                          <InstallationButton
                            {...packageInfo}
                            disabled={!packagePoliciesData || packageHasUsages}
                          />
                        </p>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </>
                )
              )}
              {packageHasUsages && removable === true && (
                <p>
                  <EuiText color="subdued">
                    <FormattedMessage
                      id="xpack.fleet.integrations.settings.packageUninstallNoteDescription.packageUninstallNoteDetail"
                      defaultMessage="{strongNote} {title} cannot be uninstalled because there are active agents that use this integration. To uninstall, remove all {title} integrations from your agent policies."
                      values={{
                        title,
                        strongNote: <NoteLabel />,
                      }}
                    />
                  </EuiText>
                </p>
              )}
              {removable === false && (
                <p>
                  <EuiText color="subdued">
                    <FormattedMessage
                      id="xpack.fleet.integrations.settings.packageUninstallNoteDescription.packageUninstallUninstallableNoteDetail"
                      defaultMessage="{strongNote} The {title} integration is installed by default and cannot be removed."
                      values={{
                        title,
                        strongNote: <NoteLabel />,
                      }}
                    />
                  </EuiText>
                </p>
              )}
            </div>
          )}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
