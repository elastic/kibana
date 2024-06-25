/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { InstallationInfo } from '../../../../../../../../common/types';
import {
  useAuthz,
  useFleetStatus,
  useInstallKibanaAssetsMutation,
  useStartServices,
} from '../../../../../hooks';

interface InstallKibanaAssetsPanelProps {
  title: string;
  installInfo: InstallationInfo;
}

export function InstallKibanaAssetsPanel({ installInfo, title }: InstallKibanaAssetsPanelProps) {
  const { spaceId } = useFleetStatus();
  const { notifications } = useStartServices();
  const { name, version } = installInfo;
  const canInstallPackages = useAuthz().integrations.installPackages;
  const { mutateAsync, isLoading } = useInstallKibanaAssetsMutation();

  const assetsInstalledInCurrentSpace =
    (!installInfo.installed_kibana_space_id && spaceId === 'default') ||
    installInfo.installed_kibana_space_id === spaceId ||
    installInfo.additional_spaces_installed_kibana?.[spaceId || 'default'];

  const handleClickInstall = useCallback(async () => {
    try {
      await mutateAsync({
        pkgName: name,
        pkgVersion: version,
      });
    } catch (err) {
      notifications.toasts.addError(err, {
        title: i18n.translate('xpack.fleet.fleetServerSetup.kibanaInstallAssetsErrorTitle', {
          defaultMessage: 'Error installing kibana assets',
        }),
      });
    }
  }, [mutateAsync, name, version, notifications.toasts]);

  if (!canInstallPackages) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <EuiTitle>
          <h4>
            <FormattedMessage
              id="xpack.fleet.integrations.settings.kibanaInstallAssetsTitle"
              defaultMessage="Kibana assets"
            />
          </h4>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <FormattedMessage
          id="xpack.fleet.integrations.settings.kibanaInstallAssetsDescription"
          defaultMessage="Install or reinstall Kibana assets in that space."
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <div>
          <EuiButton iconType="refresh" isLoading={isLoading} onClick={handleClickInstall}>
            {isLoading ? (
              assetsInstalledInCurrentSpace ? (
                <FormattedMessage
                  id="xpack.fleet.integrations.installPackage.kibanaAssetsReinstallingButtonLabel"
                  defaultMessage="Reinstalling {title} kibana assets"
                  values={{
                    title,
                  }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.fleet.integrations.installPackage.kibanaAssetsInstallingButtonLabel"
                  defaultMessage="Installing {title} kibana assets"
                  values={{
                    title,
                  }}
                />
              )
            ) : assetsInstalledInCurrentSpace ? (
              <FormattedMessage
                id="xpack.fleet.integrations.installPackage.kibanaAssetsReinstallButtonLabel"
                defaultMessage="Reinstall {title} kibana assets"
                values={{
                  title,
                }}
              />
            ) : (
              <FormattedMessage
                id="xpack.fleet.integrations.installPackage.kibanaAssetsInstallButtonLabel"
                defaultMessage="Install {title} kibana assets"
                values={{
                  title,
                }}
              />
            )}
          </EuiButton>
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
