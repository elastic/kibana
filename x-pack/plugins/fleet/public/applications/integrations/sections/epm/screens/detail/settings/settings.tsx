/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';
import semverLt from 'semver/functions/lt';

import {
  EuiCallOut,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  EuiLink,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import type { Observable } from 'rxjs';
import type { CoreTheme } from 'kibana/public';

import type { PackageInfo, UpgradePackagePolicyDryRunResponse } from '../../../../../types';
import { InstallStatus } from '../../../../../types';
import {
  useGetPackagePolicies,
  useGetPackageInstallStatus,
  useLink,
  sendUpgradePackagePolicyDryRun,
  sendUpdatePackage,
  useStartServices,
} from '../../../../../hooks';
import {
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  KEEP_POLICIES_UP_TO_DATE_PACKAGES,
  AUTO_UPGRADE_POLICIES_PACKAGES,
} from '../../../../../constants';

import { KeepPoliciesUpToDateSwitch } from '../components';

import { InstallButton } from './install_button';
import { UpdateButton } from './update_button';
import { UninstallButton } from './uninstall_button';

const SettingsTitleCell = styled.td`
  padding-right: ${(props) => props.theme.eui.spacerSizes.xl};
  padding-bottom: ${(props) => props.theme.eui.spacerSizes.m};
`;

const NoteLabel = () => (
  <strong>
    <FormattedMessage
      id="xpack.fleet.integrations.settings.packageUninstallNoteDescription.packageUninstallNoteLabel"
      defaultMessage="Note:"
    />
  </strong>
);
const UpdatesAvailableMsg = ({ latestVersion }: { latestVersion: string }) => (
  <EuiCallOut
    color="warning"
    iconType="alert"
    title={i18n.translate('xpack.fleet.integrations.settings.versionInfo.updatesAvailable', {
      defaultMessage: 'New version available',
    })}
  >
    <FormattedMessage
      id="xpack.fleet.integration.settings.versionInfo.updatesAvailableBody"
      defaultMessage="Upgrade to version {latestVersion} to get the latest features"
      values={{ latestVersion }}
    />
  </EuiCallOut>
);

const LatestVersionLink = ({ name, version }: { name: string; version: string }) => {
  const { getHref } = useLink();
  const settingsPath = getHref('integration_details_settings', {
    pkgkey: `${name}-${version}`,
  });
  return (
    <EuiLink href={settingsPath}>
      <FormattedMessage
        id="xpack.fleet.integrations.settings.packageLatestVersionLink"
        defaultMessage="latest version"
      />
    </EuiLink>
  );
};

interface Props {
  packageInfo: PackageInfo;
  theme$: Observable<CoreTheme>;
}

export const SettingsPage: React.FC<Props> = memo(({ packageInfo, theme$ }: Props) => {
  const { name, title, removable, latestVersion, version, keepPoliciesUpToDate } = packageInfo;
  const [dryRunData, setDryRunData] = useState<UpgradePackagePolicyDryRunResponse | null>();
  const [isUpgradingPackagePolicies, setIsUpgradingPackagePolicies] = useState<boolean>(false);
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const { data: packagePoliciesData } = useGetPackagePolicies({
    perPage: 1000,
    page: 1,
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${name}`,
  });

  const { notifications } = useStartServices();

  const shouldShowKeepPoliciesUpToDateSwitch = useMemo(() => {
    return KEEP_POLICIES_UP_TO_DATE_PACKAGES.some((pkg) => pkg.name === name);
  }, [name]);

  const isShowKeepPoliciesUpToDateSwitchDisabled = useMemo(() => {
    return AUTO_UPGRADE_POLICIES_PACKAGES.some((pkg) => pkg.name === name);
  }, [name]);

  const [keepPoliciesUpToDateSwitchValue, setKeepPoliciesUpToDateSwitchValue] = useState<boolean>(
    keepPoliciesUpToDate ?? false
  );

  const handleKeepPoliciesUpToDateSwitchChange = useCallback(() => {
    const saveKeepPoliciesUpToDate = async () => {
      try {
        setKeepPoliciesUpToDateSwitchValue((prev) => !prev);

        await sendUpdatePackage(packageInfo.name, packageInfo.version, {
          keepPoliciesUpToDate: !keepPoliciesUpToDateSwitchValue,
        });

        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.fleet.integrations.integrationSaved', {
            defaultMessage: 'Integration settings saved',
          }),
          text: !keepPoliciesUpToDateSwitchValue
            ? i18n.translate('xpack.fleet.integrations.keepPoliciesUpToDateEnabledSuccess', {
                defaultMessage:
                  'Fleet will automatically keep integration policies up to date for {title}',
                values: { title },
              })
            : i18n.translate('xpack.fleet.integrations.keepPoliciesUpToDateDisabledSuccess', {
                defaultMessage:
                  'Fleet will not automatically keep integration policies up to date for {title}',
                values: { title },
              }),
        });
      } catch (error) {
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.fleet.integrations.integrationSavedError', {
            defaultMessage: 'Error saving integration settings',
          }),
          toastMessage: i18n.translate('xpack.fleet.integrations.keepPoliciesUpToDateError', {
            defaultMessage: 'Error saving integration settings for {title}',
            values: { title },
          }),
        });
      }
    };

    saveKeepPoliciesUpToDate();
  }, [
    keepPoliciesUpToDateSwitchValue,
    notifications.toasts,
    packageInfo.name,
    packageInfo.version,
    title,
  ]);

  const { status: installationStatus, version: installedVersion } = getPackageInstallStatus(name);
  const packageHasUsages = !!packagePoliciesData?.total;

  const packagePolicyIds = useMemo(
    () => packagePoliciesData?.items.map(({ id }) => id),
    [packagePoliciesData]
  );

  useEffect(() => {
    const fetchDryRunData = async () => {
      if (packagePolicyIds && packagePolicyIds.length) {
        const { data } = await sendUpgradePackagePolicyDryRun(packagePolicyIds, latestVersion);

        setDryRunData(data);
      }
    };

    fetchDryRunData();
  }, [latestVersion, packagePolicyIds]);

  const updateAvailable =
    installedVersion && semverLt(installedVersion, latestVersion) ? true : false;

  const isViewingOldPackage = version < latestVersion;
  // hide install/remove options if the user has version of the package is installed
  // and this package is out of date or if they do have a version installed but it's not this one
  const hideInstallOptions =
    (installationStatus === InstallStatus.notInstalled && isViewingOldPackage) ||
    (installationStatus === InstallStatus.installed && installedVersion !== version);

  const isUpdating = installationStatus === InstallStatus.installing && installedVersion;

  const numOfAssets = useMemo(
    () =>
      Object.entries(packageInfo.assets).reduce(
        (acc, [serviceName, serviceNameValue]) =>
          acc +
          Object.entries(serviceNameValue).reduce(
            (acc2, [assetName, assetNameValue]) => acc2 + assetNameValue.length,
            0
          ),
        0
      ),
    [packageInfo.assets]
  );

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
                      <EuiTitle size="xs" data-test-subj="installedVersion">
                        <span>{installedVersion}</span>
                      </EuiTitle>
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
                      <EuiTitle size="xs" data-test-subj="latestVersion">
                        <span>{latestVersion}</span>
                      </EuiTitle>
                    </td>
                  </tr>
                </tbody>
              </table>
              {shouldShowKeepPoliciesUpToDateSwitch && (
                <>
                  <KeepPoliciesUpToDateSwitch
                    checked={keepPoliciesUpToDateSwitchValue}
                    onChange={handleKeepPoliciesUpToDateSwitchChange}
                    disabled={isShowKeepPoliciesUpToDateSwitchDisabled}
                  />
                  <EuiSpacer size="l" />
                </>
              )}

              {(updateAvailable || isUpgradingPackagePolicies) && (
                <>
                  <UpdatesAvailableMsg latestVersion={latestVersion} />
                  <EuiSpacer size="l" />
                  <p>
                    <UpdateButton
                      {...packageInfo}
                      version={latestVersion}
                      packagePolicyIds={packagePolicyIds}
                      dryRunData={dryRunData}
                      isUpgradingPackagePolicies={isUpgradingPackagePolicies}
                      setIsUpgradingPackagePolicies={setIsUpgradingPackagePolicies}
                      theme$={theme$}
                    />
                  </p>
                </>
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
                  <EuiFlexGroup>
                    <EuiFlexItem grow={false}>
                      <p>
                        <InstallButton
                          {...packageInfo}
                          numOfAssets={numOfAssets}
                          disabled={!packagePoliciesData || packageHasUsages}
                        />
                      </p>
                    </EuiFlexItem>
                  </EuiFlexGroup>
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
                          <UninstallButton
                            {...packageInfo}
                            numOfAssets={numOfAssets}
                            latestVersion={latestVersion}
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
                      defaultMessage="{strongNote} The {title} integration is a system integration and cannot be removed."
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
          {hideInstallOptions && isViewingOldPackage && !isUpdating && (
            <div>
              <EuiSpacer size="s" />
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
                  <EuiText color="subdued">
                    <FormattedMessage
                      id="xpack.fleet.integrations.settings.packageSettingsOldVersionMessage"
                      defaultMessage="Version {version} is out of date. The {latestVersion} of this integration is available to be installed."
                      values={{
                        version,
                        latestVersion: <LatestVersionLink name={name} version={latestVersion} />,
                      }}
                    />
                  </EuiText>
                </p>
              </div>
            </div>
          )}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
