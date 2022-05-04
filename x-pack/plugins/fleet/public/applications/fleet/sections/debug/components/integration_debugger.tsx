/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiComboBox,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { useMutation, useQuery } from 'react-query';

import { getEuiIconType } from '../../../../../services/icons';

import {
  sendGetPackages,
  sendInstallPackage,
  sendRemovePackage,
  useLink,
  useStartServices,
} from '../../../hooks';
import type { PackageListItem } from '../../../types';
import { queryClient } from '..';
import { pkgKeyFromPackageInfo } from '../../../services';

const fetchInstalledIntegrations = async () => {
  const response = await sendGetPackages({ experimental: true });

  if (response.error) {
    throw new Error(response.error.message);
  }

  const installedIntegrations = response.data?.items.filter(({ status }) => status === 'installed');

  return installedIntegrations;
};

export const IntegrationDebugger: React.FunctionComponent = () => {
  const { http, notifications } = useStartServices();
  const { getHref } = useLink();

  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>();
  const [isReinstallModalVisible, setIsReinstallModalVisible] = useState(false);
  const [isUninstallModalVisible, setIsUninstallModalVisible] = useState(false);

  const integrations = useQuery('debug-integrations', fetchInstalledIntegrations);

  const uninstallMutation = useMutation(async (integration: PackageListItem) => {
    const response = await sendRemovePackage(integration.name, integration.version, true);

    if (response.error) {
      notifications.toasts.addError(response.error, {
        title: `Error uninstalling ${integration.title}`,
        toastMessage: response.error.message,
      });

      setIsUninstallModalVisible(false);
      throw new Error(response.error.message);
    }

    notifications.toasts.addSuccess(`Successfully uninstalled ${integration.title}`);

    setSelectedIntegrationId(undefined);
    setIsUninstallModalVisible(false);

    queryClient.invalidateQueries('debug-integrations');

    return response.data;
  });

  const reinstallMutation = useMutation(async (integration: PackageListItem) => {
    const uninstallResponse = await sendRemovePackage(integration.name, integration.version, true);

    if (uninstallResponse.error) {
      notifications.toasts.addError(uninstallResponse.error, {
        title: `Error reinstalling ${integration.title}`,
        toastMessage: uninstallResponse.error.message,
      });

      setIsReinstallModalVisible(false);
      throw new Error(uninstallResponse.error.message);
    }

    const installResponse = await sendInstallPackage(integration.name, integration.version);

    if (installResponse.error) {
      notifications.toasts.addError(installResponse.error, {
        title: `Error reinstalling ${integration.title}`,
        toastMessage: installResponse.error.message,
      });

      setIsReinstallModalVisible(false);
      throw new Error(installResponse.error.message);
    }

    notifications.toasts.addSuccess(`Successfully reinstalled ${integration.title}`);

    setSelectedIntegrationId(undefined);
    setIsReinstallModalVisible(false);

    queryClient.invalidateQueries('debug-integrations');

    return installResponse.data;
  });

  if (integrations.status === 'error') {
    return (
      <EuiCallOut title="Error" color="danger">
        Error fetching installed Integrations
      </EuiCallOut>
    );
  }

  const comboBoxOptions =
    integrations.data?.map((integration) => ({
      label: integration.name,
      value: integration.id,
      icon: getEuiIconType(integration, http.basePath),
    })) ?? [];

  const selectedOptions = selectedIntegrationId
    ? [comboBoxOptions.find((option) => option.value === selectedIntegrationId)!]
    : [];

  const selectedIntegration = integrations.data?.find(
    (integration) => integration.id === selectedIntegrationId
  );

  return (
    <>
      <EuiText grow={false}>
        <p>Use this tool to uninstall or reinstall installed integrations.</p>
        <p>
          Reinstalling an integration will uninstall and then immediately install it again. This can
          be useful in restoring broken or malformed integration installations when a user hasn{"'"}
          t done much customization.
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      <EuiFlexGroup alignItems="center" justifyContent="flexStart">
        <EuiFlexItem
          grow={false}
          css={`
            min-width: 600px;
          `}
        >
          <EuiComboBox
            aria-label="Select an Integration"
            placeholder="Select an Integration"
            fullWidth
            options={comboBoxOptions}
            singleSelection={{ asPlainText: true }}
            selectedOptions={selectedOptions}
            isDisabled={integrations.status === 'loading'}
            prepend={
              selectedOptions.length > 0 ? (
                <EuiButtonEmpty>
                  <EuiIcon type={selectedOptions[0]?.icon ?? 'fleetApp'} />
                </EuiButtonEmpty>
              ) : undefined
            }
            renderOption={(option, searchValue, contentClassName) => (
              <span className={contentClassName}>
                <EuiIcon type={(option as any).icon} />
                &nbsp;
                <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
              </span>
            )}
            onChange={(newSelectedOptions) => {
              // Handle "clear" action
              if (!newSelectedOptions.length) {
                setSelectedIntegrationId(undefined);
              } else {
                setSelectedIntegrationId(newSelectedOptions[0].value);
              }
            }}
          />
        </EuiFlexItem>

        {selectedIntegration && (
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButton color="primary" onClick={() => setIsReinstallModalVisible(true)}>
                Reinstall
              </EuiButton>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButton color="danger" onClick={() => setIsUninstallModalVisible(true)}>
                Uninstall
              </EuiButton>
            </EuiFlexItem>

            {isReinstallModalVisible && (
              <EuiConfirmModal
                title={`Reinstall ${selectedIntegration.title}`}
                onCancel={() => setIsReinstallModalVisible(false)}
                onConfirm={() => reinstallMutation.mutate(selectedIntegration)}
                isLoading={reinstallMutation.isLoading}
                cancelButtonText="Cancel"
                confirmButtonText="Reinstall"
              >
                Are you sure you want to reinstall {selectedIntegration.title}?
              </EuiConfirmModal>
            )}

            {isUninstallModalVisible && (
              <EuiConfirmModal
                title={`Uninstall ${selectedIntegration.title}`}
                onCancel={() => setIsUninstallModalVisible(false)}
                onConfirm={() => uninstallMutation.mutate(selectedIntegration)}
                isLoading={uninstallMutation.isLoading}
                cancelButtonText="Cancel"
                confirmButtonText="Uninstall"
              >
                Are you sure you want to uninstall {selectedIntegration.title}?
              </EuiConfirmModal>
            )}
          </EuiFlexGroup>
        )}
      </EuiFlexGroup>

      {selectedIntegration && (
        <>
          <EuiSpacer size="m" />
          <EuiLink
            target="_blank"
            href={getHref('integration_details_overview', {
              pkgkey: pkgKeyFromPackageInfo({
                name: selectedIntegration.name,
                version: selectedIntegration.version,
              }),
            })}
          >
            View integration settings in Integrations UI
          </EuiLink>
        </>
      )}
    </>
  );
};
