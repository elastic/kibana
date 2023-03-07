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
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import type { PLATFORM_TYPE } from '../../hooks';

import type { Commands } from './commands_for_platforms';
import { CommandsForPlatforms } from './commands_for_platforms';

interface Props {
  policyId?: string;
  onClose: () => void;
}

// todo: update with real API and extract if needed
const useCommands = (policyId: string | undefined): Commands => {
  const commands = useMemo(
    () =>
      (['linux', 'deb', 'windows', 'mac', 'rpm'] as PLATFORM_TYPE[]).reduce<Commands>(
        (_commands, platform) => ({
          ..._commands,
          [platform]: policyId ? `${platform} command for ${policyId}` : `${platform} command`,
        }),
        {}
      ),
    [policyId]
  );

  return commands;
};

export const UninstallCommandFlyout: React.FunctionComponent<Props> = ({ policyId, onClose }) => {
  const commands = useCommands(policyId);

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

        <CommandsForPlatforms commands={commands} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
