/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { EuiStepProps } from '@elastic/eui';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { PLATFORM_TYPE } from '../../../../../hooks';
import { useDefaultOutput, useKibanaVersion } from '../../../../../hooks';

import type { QuickStartCreateForm } from '../../../hooks';

import { PlatformSelector } from '../../../../enrollment_instructions/manual/platform_selector';

import { getInstallCommandForPlatform } from '../../../utils';

export function getInstallFleetServerStep({
  isFleetServerReady,
  quickStartCreateForm,
}: {
  isFleetServerReady: boolean;
  quickStartCreateForm: QuickStartCreateForm;
}): EuiStepProps {
  return {
    title: i18n.translate('xpack.fleet.fleetServerFlyout.installFleetServerTitle', {
      defaultMessage: 'Install Fleet Server to a centralized host',
    }),
    status:
      quickStartCreateForm.status === 'success'
        ? isFleetServerReady
          ? 'complete'
          : 'current'
        : 'disabled',
    children: <InstallFleetServerStepContent quickStartCreateForm={quickStartCreateForm} />,
  };
}

const InstallFleetServerStepContent: React.FunctionComponent<{
  quickStartCreateForm: QuickStartCreateForm;
}> = ({ quickStartCreateForm }) => {
  const kibanaVersion = useKibanaVersion();
  const { output } = useDefaultOutput();

  const installCommands = (['linux', 'mac', 'windows', 'deb', 'rpm'] as PLATFORM_TYPE[]).reduce(
    (acc, platform) => {
      acc[platform] = getInstallCommandForPlatform(
        platform,
        output?.hosts?.[0] ?? '',
        quickStartCreateForm.serviceToken ?? '',
        quickStartCreateForm.fleetServerPolicyId,
        quickStartCreateForm.fleetServerHost,
        false,
        output?.ca_trusted_fingerprint,
        kibanaVersion
      );

      return acc;
    },
    {} as Record<PLATFORM_TYPE, string>
  );

  if (quickStartCreateForm.status !== 'success') {
    return null;
  }

  return (
    <>
      <EuiText>
        <FormattedMessage
          id="xpack.fleet.fleetServerFlyout.installFleetServerInstructions"
          defaultMessage="Install fleet Server agent on a centralized host so that other hosts you wish to monitor can connect to it. In production, we recommend using one or more dedicated hosts. "
        />
      </EuiText>

      <EuiSpacer size="l" />

      <PlatformSelector
        linuxCommand={installCommands.linux}
        macCommand={installCommands.mac}
        windowsCommand={installCommands.windows}
        linuxDebCommand={installCommands.deb}
        linuxRpmCommand={installCommands.rpm}
        isK8s={false}
      />
    </>
  );
};
