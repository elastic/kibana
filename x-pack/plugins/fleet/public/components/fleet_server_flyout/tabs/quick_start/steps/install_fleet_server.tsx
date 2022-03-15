/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import type { EuiStepProps } from '@elastic/eui';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useKibanaVersion } from '../../../../../hooks';

import type { useQuickStartCreateForm } from '../../../hooks';

// TODO: Relocate this file to a more common location
import { PlatformSelector } from '../../../../enrollment_instructions/manual/platform_selector';

const ARTIFACT_BASE_URL = 'https://artifacts.elastic.co/downloads/beats/elastic-agent';

export function getInstallFleetServerStep({
  isFleetServerReady,
  quickStartCreateForm,
}: {
  isFleetServerReady: boolean;
  quickStartCreateForm: ReturnType<typeof useQuickStartCreateForm>;
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
  quickStartCreateForm: ReturnType<typeof useQuickStartCreateForm>;
}> = ({ quickStartCreateForm }) => {
  const kibanaVersion = useKibanaVersion();

  const commands = useMemo(
    () => ({
      macos: [
        `curl -L -O ${ARTIFACT_BASE_URL}/elastic-agent-${kibanaVersion}-darwin-x86_64.tar.gz`,
        `tar xzvf elastic-agent-${kibanaVersion}-darwin-x86_64.tar.gz`,
        `sudo ./elastic-agent install \\
--fleet-server-es=http://192.0.2.0:9200 \\
--fleet-server-service-token=${quickStartCreateForm.serviceToken}`,
      ].join('\n'),
      linux: 'To-Do',
      windows: 'To-Do',
      deb: 'To-Do',
      rpm: 'To-Do',
    }),
    [kibanaVersion, quickStartCreateForm.serviceToken]
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
        macOsCommand={commands.macos}
        linuxCommand={commands.linux}
        windowsCommand={commands.windows}
        debCommand={commands.deb}
        rpmCommand={commands.rpm}
        isK8s={false}
      />
    </>
  );
};
