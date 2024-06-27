/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { InstallationInfo } from '../../../../../../../../common/types';
import { useAuthz, useInstallKibanaAssetsMutation, useStartServices } from '../../../../../hooks';

interface InstallKibanaAssetsButtonProps {
  title: string;
  installInfo: InstallationInfo;
  onSuccess?: () => void;
}

export function InstallKibanaAssetsButton({
  installInfo,
  title,
  onSuccess,
}: InstallKibanaAssetsButtonProps) {
  const { notifications } = useStartServices();
  const { name, version } = installInfo;
  const canInstallPackages = useAuthz().integrations.installPackages;
  const { mutateAsync, isLoading } = useInstallKibanaAssetsMutation();

  const handleClickInstall = useCallback(async () => {
    try {
      await mutateAsync({
        pkgName: name,
        pkgVersion: version,
      });
      if (onSuccess) {
        await onSuccess();
      }
    } catch (err) {
      notifications.toasts.addError(err, {
        title: i18n.translate('xpack.fleet.fleetServerSetup.kibanaInstallAssetsErrorTitle', {
          defaultMessage: 'Error installing Kibana assets',
        }),
      });
    }
  }, [mutateAsync, onSuccess, name, version, notifications.toasts]);

  return (
    <EuiButton
      disabled={!canInstallPackages}
      iconType="importAction"
      isLoading={isLoading}
      onClick={handleClickInstall}
    >
      {isLoading ? (
        <FormattedMessage
          id="xpack.fleet.integrations.installPackage.kibanaAssetsInstallingButtonLabel"
          defaultMessage="Installing Kibana assets in current space"
          values={{
            title,
          }}
        />
      ) : (
        <FormattedMessage
          id="xpack.fleet.integrations.installPackage.kibanaAssetsInstallButtonLabel"
          defaultMessage="Install Kibana assets in current space"
          values={{
            title,
          }}
        />
      )}
    </EuiButton>
  );
}
