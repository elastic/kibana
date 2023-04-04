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

import { CommandsForPlatforms } from './commands_for_platforms';
import { useCommands } from './hooks';
import type { UninstallCommandTarget } from './types';

const DESCRIPTION_PER_TARGET: { [key in UninstallCommandTarget]: React.ReactElement } = {
  agent: (
    <>
      <h3>
        <FormattedMessage
          id="xpack.fleet.agentUninstallCommand.subtitle"
          defaultMessage="Uninstall Elastic Agent on your host"
        />
      </h3>
      <p>
        <FormattedMessage
          id="xpack.fleet.agentUninstallCommand.description"
          defaultMessage="Use the below uninstall command to uninstall Agent... [TODO]"
        />
      </p>
    </>
  ),
  endpoint: (
    <>
      <h3>
        <FormattedMessage
          id="xpack.fleet.endpointUninstallCommand.subtitle"
          defaultMessage="Uninstall Elastic Defend integration on your host"
        />
      </h3>
      <p>
        <FormattedMessage
          id="xpack.fleet.endpointUninstallCommand.description"
          defaultMessage="Use the below uninstall command to uninstall Endpoint integration... [TODO]"
        />
      </p>
    </>
  ),
};

export interface UninstallCommandFlyoutProps {
  target: UninstallCommandTarget;
  policyId?: string;
  onClose: () => void;
}

export const UninstallCommandFlyout: React.FunctionComponent<UninstallCommandFlyoutProps> = ({
  policyId,
  onClose,
  target,
}) => {
  const commands = useCommands(policyId, target);

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
        <EuiText>{DESCRIPTION_PER_TARGET[target]}</EuiText>

        <EuiSpacer size="l" />

        <CommandsForPlatforms commands={commands} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
