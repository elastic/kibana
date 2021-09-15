/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiCheckbox,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { sumBy } from 'lodash';

import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '../../../../../constants';
import type {
  GetAgentPoliciesResponse,
  PackageInfo,
  UpgradePackagePolicyDryRunResponse,
} from '../../../../../types';
import { InstallStatus } from '../../../../../types';
import {
  useCapabilities,
  useUninstallPackage,
  useGetPackageInstallStatus,
  useInstallPackage,
  sendGetAgentPolicies,
  sendUpgradePackagePolicy,
  useLink,
  useStartServices,
} from '../../../../../hooks';

import { toMountPoint } from '../../../../../../../../../../../src/plugins/kibana_react/public';

import { ConfirmPackageUninstall } from './confirm_package_uninstall';
import { ConfirmPackageInstall } from './confirm_package_install';

/*

  This component defines the logic for two mutative operations related to integrations:

  1. Installing a currently-uninstalled integration
  2. Updating an installed integration to a new version

  Installing a new integration is straightforward. We display a confirmation modal and make an API call to install
  the package upon confirmation.

  Updating an integration to a new version entails a bit more logic. We allow the user to choose whether they'd like to
  simultaneously upgrade any package policies that include the current version of the integration. For example, if
  a user is running four agent policies that include the `nginx-0.2.4` package and they update to `nginx-0.7.0`, they
  can elect to also deploy the new integration version to any agent running one of those four agent policies.

  If the user does not elect to upgrade their running policies, we simply install the latest version of the package and
  navigate to the new version's settings page, e.g. `/detail/nginx-0.7.0/settings`.

  If the user _does_ elect to upgrade their running policies, we display a confirmation modal. In this modal, we'll report the
  number of agents and policies that will be affected by the upgrade, and if there are any conflicts. In the case of a conflict
  between versions, an upgrade for a given package policy will be skipped and the user will need to manually recreate their policy
  to resolve any breaking changes between versions. Once the user confirms, we first install the latest version of the integration,
  then we make a call to the "upgrade policies" API endpoint with a list of all package policy ID's that include the current version
  of the integration. This API endpoint will complete the upgrade process in bulk for each package policy provided. Upon completion,
  we navigate to the new version's settings page, as above.

*/

type InstallationButtonProps = Pick<PackageInfo, 'assets' | 'name' | 'title' | 'version'> & {
  disabled?: boolean;
  isUpdate?: boolean;
  latestVersion?: string;
  packagePolicyIds?: string[];
  dryRunData?: UpgradePackagePolicyDryRunResponse | null;
  isUpgradingPackagePolicies?: boolean;
  setIsUpgradingPackagePolicies?: React.Dispatch<React.SetStateAction<boolean>>;
};
export function InstallationButton(props: InstallationButtonProps) {
  const {
    assets,
    name,
    title,
    version,
    disabled = true,
    isUpdate = false,
    latestVersion,
    packagePolicyIds = [],
    dryRunData,
    isUpgradingPackagePolicies = false,
    setIsUpgradingPackagePolicies = () => {},
  } = props;
  const { notifications } = useStartServices();
  const hasWriteCapabilites = useCapabilities().write;
  const installPackage = useInstallPackage();
  const uninstallPackage = useUninstallPackage();
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const { status: installationStatus } = getPackageInstallStatus(name);

  const history = useHistory();
  const { getPath } = useLink();

  const isInstalling = installationStatus === InstallStatus.installing;
  const isRemoving = installationStatus === InstallStatus.uninstalling;
  const isInstalled = installationStatus === InstallStatus.installed;
  const showUninstallButton = isInstalled || isRemoving;
  const [isInstallModalVisible, setIsInstallModalVisible] = useState<boolean>(false);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState<boolean>(false);
  const [upgradePackagePolicies, setUpgradePackagePolicies] = useState<boolean>(true);
  const [agentPolicyData, setAgentPolicyData] = useState<GetAgentPoliciesResponse | null>();

  useEffect(() => {
    const fetchAgentPolicyData = async () => {
      if (packagePolicyIds && packagePolicyIds.length > 0) {
        const { data } = await sendGetAgentPolicies({
          perPage: 1000,
          page: 1,
          // Fetch all agent policies that include one of the eligible package policies
          kuery: `${AGENT_POLICY_SAVED_OBJECT_TYPE}.package_policies:${packagePolicyIds
            .map((id) => `"${id}"`)
            .join(' or ')}`,
        });

        setAgentPolicyData(data);
      }
    };

    fetchAgentPolicyData();
  }, [packagePolicyIds]);

  const packagePolicyCount = useMemo(() => packagePolicyIds.length, [packagePolicyIds]);
  const agentCount = useMemo(() => sumBy(agentPolicyData?.items, ({ agents }) => agents ?? 0), [
    agentPolicyData,
  ]);
  const conflictCount = useMemo(() => dryRunData?.filter((item) => item.hasErrors).length, [
    dryRunData,
  ]);

  const toggleInstallModal = useCallback(() => {
    setIsInstallModalVisible(!isInstallModalVisible);
  }, [isInstallModalVisible]);

  const handleClickInstall = useCallback(() => {
    installPackage({ name, version, title });
    toggleInstallModal();
  }, [installPackage, name, title, toggleInstallModal, version]);

  const navigateToNewSettingsPage = useCallback(() => {
    const settingsPath = getPath('integration_details_settings', {
      pkgkey: `${name}-${version}`,
    });
    history.push(settingsPath);
  }, [history, getPath, name, version]);

  const handleClickUpdate = useCallback(async () => {
    await installPackage({ name, version, title, fromUpdate: true });
  }, [installPackage, name, title, version]);

  const handleClickUpgradePolicies = useCallback(async () => {
    if (isUpgradingPackagePolicies) {
      return;
    }

    setIsUpgradingPackagePolicies(true);

    await installPackage({ name, version, title });

    await sendUpgradePackagePolicy(
      // Only upgrade policies that don't have conflicts
      packagePolicyIds.filter(
        (id) => !dryRunData?.find((dryRunRecord) => dryRunRecord.diff?.[0].id === id)?.hasErrors
      )
    );

    setIsUpgradingPackagePolicies(false);
    setIsUpdateModalVisible(false);

    notifications.toasts.addSuccess({
      title: toMountPoint(
        <FormattedMessage
          id="xpack.fleet.integrations.packageUpdateSuccessTitle"
          defaultMessage="Updated {title} and upgraded policies"
          values={{ title }}
        />
      ),
      text: toMountPoint(
        <FormattedMessage
          id="xpack.fleet.integrations.packageUpdateSuccessDescription"
          defaultMessage="Successfully updated {title} and upgraded policies"
          values={{ title }}
        />
      ),
    });

    navigateToNewSettingsPage();
  }, [
    dryRunData,
    installPackage,
    isUpgradingPackagePolicies,
    name,
    navigateToNewSettingsPage,
    notifications.toasts,
    packagePolicyIds,
    setIsUpgradingPackagePolicies,
    title,
    version,
  ]);

  const handleClickUninstall = useCallback(() => {
    uninstallPackage({ name, version, title, redirectToVersion: latestVersion ?? version });
    toggleInstallModal();
  }, [uninstallPackage, name, title, toggleInstallModal, version, latestVersion]);

  const handleUpgradePackagePoliciesChange = useCallback(() => {
    setUpgradePackagePolicies((prev) => !prev);
  }, []);

  // counts the number of assets in the package
  const numOfAssets = useMemo(
    () =>
      Object.entries(assets).reduce(
        (acc, [serviceName, serviceNameValue]) =>
          acc +
          Object.entries(serviceNameValue).reduce(
            (acc2, [assetName, assetNameValue]) => acc2 + assetNameValue.length,
            0
          ),
        0
      ),
    [assets]
  );

  const installButton = (
    <EuiButton iconType={'importAction'} isLoading={isInstalling} onClick={toggleInstallModal}>
      {isInstalling ? (
        <FormattedMessage
          id="xpack.fleet.integrations.installPackage.installingPackageButtonLabel"
          defaultMessage="Installing {title} assets"
          values={{
            title,
          }}
        />
      ) : (
        <FormattedMessage
          id="xpack.fleet.integrations.installPackage.installPackageButtonLabel"
          defaultMessage="Install {title} assets"
          values={{
            title,
          }}
        />
      )}
    </EuiButton>
  );

  const updateButton = (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiButton
          iconType={'refresh'}
          isLoading={isInstalling}
          onClick={upgradePackagePolicies ? () => setIsUpdateModalVisible(true) : handleClickUpdate}
        >
          <FormattedMessage
            id="xpack.fleet.integrations.updatePackage.updatePackageButtonLabel"
            defaultMessage="Update to latest version"
          />
        </EuiButton>
      </EuiFlexItem>
      {packagePolicyCount > 0 && (
        <EuiFlexItem grow={false}>
          <EuiCheckbox
            compressed
            labelProps={{
              style: {
                display: 'flex',
              },
            }}
            id="upgradePoliciesCheckbox"
            checked={upgradePackagePolicies}
            onChange={handleUpgradePackagePoliciesChange}
            label={i18n.translate(
              'xpack.fleet.integrations.updatePackage.upgradePoliciesCheckboxLabel',
              {
                defaultMessage: 'Upgrade integration policies',
              }
            )}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );

  const uninstallButton = (
    <EuiButton
      iconType={'trash'}
      isLoading={isRemoving}
      onClick={toggleInstallModal}
      color="danger"
      disabled={disabled || isRemoving ? true : false}
    >
      {isRemoving ? (
        <FormattedMessage
          id="xpack.fleet.integrations.uninstallPackage.uninstallingPackageButtonLabel"
          defaultMessage="Uninstalling {title}"
          values={{
            title,
          }}
        />
      ) : (
        <FormattedMessage
          id="xpack.fleet.integrations.uninstallPackage.uninstallPackageButtonLabel"
          defaultMessage="Uninstall {title}"
          values={{
            title,
          }}
        />
      )}
    </EuiButton>
  );

  const uninstallModal = (
    <ConfirmPackageUninstall
      // this is number of which would be installed
      // deleted includes ingest-pipelines etc so could be larger
      // not sure how to do this at the moment so using same value
      numOfAssets={numOfAssets}
      packageName={title}
      onCancel={toggleInstallModal}
      onConfirm={handleClickUninstall}
    />
  );

  const installModal = (
    <ConfirmPackageInstall
      numOfAssets={numOfAssets}
      packageName={title}
      onCancel={toggleInstallModal}
      onConfirm={handleClickInstall}
    />
  );

  const updateModal = (
    <EuiConfirmModal
      isLoading={isUpgradingPackagePolicies}
      maxWidth={568}
      onCancel={() => {
        setIsUpdateModalVisible(false);
      }}
      cancelButtonText={i18n.translate(
        'xpack.fleet.integrations.settings.confirmUpdateModal.cancel',
        { defaultMessage: 'Cancel' }
      )}
      onConfirm={handleClickUpgradePolicies}
      confirmButtonText={i18n.translate(
        'xpack.fleet.integrations.settings.confirmUpdateModal.confirm',
        { defaultMessage: 'Upgrade {packageName} and policies', values: { packageName: title } }
      )}
      title={i18n.translate('xpack.fleet.integrations.settings.confirmUpdateModal.updateTitle', {
        defaultMessage: 'Upgrade {packageName} and policies',
        values: { packageName: title },
      })}
    >
      <>
        {conflictCount && conflictCount > 0 ? (
          <>
            <EuiCallOut
              color="warning"
              iconType="alert"
              title={i18n.translate(
                'xpack.fleet.integrations.settings.confirmUpdateModal.conflictCallOut.title',
                { defaultMessage: 'Some integration policies have conflicts' }
              )}
            >
              <strong>
                <FormattedMessage
                  id="xpack.fleet.integrations.settings.confirmUpdateModal.conflictCallOut.integrationPolicyCount"
                  defaultMessage="{conflictCount, plural, one { # integration policy} other { # integration policies}}"
                  values={{ conflictCount }}
                />
              </strong>{' '}
              <FormattedMessage
                id="xpack.fleet.integrations.settings.confirmUpdateModal.conflictCallOut.body"
                defaultMessage="{conflictCount, plural, one { has} other { have}} conflicts and will not be upgraded automatically.
                  You can manually resolve these conflicts via agent policy settings in Fleet after performing this upgrade."
                values={{ conflictCount }}
              />
            </EuiCallOut>

            <EuiSpacer size="l" />
          </>
        ) : null}
        <FormattedMessage
          id="xpack.fleet.integrations.settings.confirmUpdateModal.body"
          defaultMessage="This action will deploy updates to all agents which use these policies.
          Fleet has detected that {packagePolicyCountText} {packagePolicyCount, plural, one { is} other { are}} ready to be upgraded
          and {packagePolicyCount, plural, one { is} other { are}} already in use by {agentCountText}."
          values={{
            packagePolicyCount,
            packagePolicyCountText: (
              <strong>
                <FormattedMessage
                  id="xpack.fleet.integrations.confirmUpdateModal.body.policyCount"
                  defaultMessage="{packagePolicyCount, plural, one {# integration policy} other {# integration policies}}"
                  values={{ packagePolicyCount }}
                />
              </strong>
            ),
            agentCountText: (
              <strong>
                <FormattedMessage
                  id="xpack.fleet.integrations.confirmUpdateModal.body.agentCount"
                  defaultMessage="{agentCount, plural, one {# agent} other {# agents}}"
                  values={{ agentCount }}
                />
              </strong>
            ),
          }}
        />
      </>
    </EuiConfirmModal>
  );

  return hasWriteCapabilites ? (
    <Fragment>
      {isUpdate ? updateButton : showUninstallButton ? uninstallButton : installButton}
      {isInstallModalVisible && (isInstalled ? uninstallModal : installModal)}
      {isUpdateModalVisible && updateModal}
    </Fragment>
  ) : null;
}
