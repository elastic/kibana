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
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { useStartServices } from '../../hooks';

import { CommandsForPlatforms } from './commands_for_platforms';
import { useCommands } from './hooks';
import type { UninstallCommandTarget } from './types';

const UninstallAgentDescription = () => {
  const { docLinks } = useStartServices();

  return (
    <>
      <p>
        <FormattedMessage
          id="xpack.fleet.agentUninstallCommandFlyout.firstParagraph"
          defaultMessage="Uninstall Elastic Agent and unenroll in Fleet to stop communicating with the host."
        />
      </p>
      <h3>
        <FormattedMessage
          id="xpack.fleet.agentUninstallCommandFlyout.subtitle"
          defaultMessage="Uninstall Elastic Agent on your host"
        />
      </h3>
      <p>
        <FormattedMessage
          id="xpack.fleet.agentUninstallCommandFlyout.description"
          defaultMessage="Select the appropriate platform and run the command to uninstall Elastic Agent. Reuse the command to uninstall agents on more than one host. {learnMoreLink}"
          values={{
            learnMoreLink: (
              <EuiLink href={docLinks.links.fleet.uninstallAgent} target="_blank">
                {i18n.translate('xpack.fleet.agentUninstallCommandFlyout.learnMore', {
                  defaultMessage: 'Learn more',
                })}
              </EuiLink>
            ),
          }}
        />
      </p>
    </>
  );
};

const UninstallEndpointDescription = () => (
  <>
    <h3>
      <FormattedMessage
        id="xpack.fleet.endpointUninstallCommandFlyout.subtitle"
        defaultMessage="Uninstall Elastic Defend integration on your host"
      />
    </h3>
    <p>
      <FormattedMessage
        id="xpack.fleet.endpointUninstallCommandFlyout.description"
        defaultMessage="Use the below uninstall command to uninstall Endpoint integration... [TODO]"
      />
    </p>
  </>
);

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
    <EuiFlyout onClose={onClose} data-test-subj="uninstall-command-flyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="xpack.fleet.agentUninstallCommandFlyout.title"
              defaultMessage="Uninstall agent"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiText>
          {target === 'agent' ? <UninstallAgentDescription /> : <UninstallEndpointDescription />}
        </EuiText>

        <EuiSpacer size="l" />

        <CommandsForPlatforms commands={commands} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
