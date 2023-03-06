/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import type { CommandsByPlatform } from '../applications/fleet/components/fleet_server_instructions/utils/install_command_utils';

import { PlatformSelector } from './platform_selector';

interface Props {
  onClose: () => void;
}

// todo
const commands: CommandsByPlatform = {
  linux: 'linux uninstall command',
  mac: 'mac uninstall command',
  windows: 'windows uninstall command',
  rpm: 'rpm uninstall command',
  deb: 'deb uninstall command',
  kubernetes: 'kubernetes uninstall command',
};

export const UninstallCommandFlyout: React.FunctionComponent<Props> = ({ onClose }) => {
  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="xpack.fleet.agentUninstallCommand.title"
              defaultMessage="Get uninstall command"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <h3>
            <FormattedMessage
              id="xpack.fleet.agentUninstallCommand.subtitle"
              defaultMessage="Uninstall Elastic Agent on your host"
            />
          </h3>
          <p>
            <FormattedMessage
              id="xpack.fleet.agentUninstallCommand.description"
              defaultMessage="Select the platform to uninstall... [TODO]"
            />
          </p>
        </EuiText>

        <EuiSpacer size="l" />

        <PlatformSelector
          linuxCommand={commands.linux}
          macCommand={commands.mac}
          windowsCommand={commands.windows}
          linuxDebCommand={commands.deb}
          linuxRpmCommand={commands.rpm}
          k8sCommand={''}
          hasK8sIntegration={false}
          hasK8sIntegrationMultiPage={false}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
