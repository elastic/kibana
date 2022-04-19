/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiText, EuiSpacer, EuiButton, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { InstalledIntegrationPolicy } from './use_get_agent_incoming_data';
import { useGetAgentIncomingData, usePollingIncomingData } from './use_get_agent_incoming_data';

interface Props {
  agentIds: string[];
  installedPolicy?: InstalledIntegrationPolicy;
  agentDataConfirmed: boolean;
  setAgentDataConfirmed: (v: boolean) => void;
  troubleshootLink: string;
}

export const ConfirmIncomingData: React.FunctionComponent<Props> = ({
  agentIds,
  installedPolicy,
  agentDataConfirmed,
  setAgentDataConfirmed,
  troubleshootLink,
}) => {
  const { incomingData, isLoading } = usePollingIncomingData(agentIds);

  const { enrolledAgents, numAgentsWithData, linkButton, message } = useGetAgentIncomingData(
    incomingData,
    installedPolicy
  );

  if (!isLoading && enrolledAgents > 0 && numAgentsWithData > 0) {
    setAgentDataConfirmed(true);
  }
  if (!agentDataConfirmed) {
    return (
      <EuiText>
        <FormattedMessage
          id="xpack.fleet.confirmIncomingData.loading"
          defaultMessage="It may take a few minutes for data to arrive in Elasticsearch. If the system is not generating data, it may help to generate some to ensure data is being collected correctly. If you’re having trouble, see our {link}. You may close this dialog and check later by viewing your integration assets."
          values={{
            link: (
              <EuiLink target="_blank" external href={troubleshootLink}>
                <FormattedMessage
                  id="xpack.fleet.enrollmentInstructions.troubleshootingLink"
                  defaultMessage="troubleshooting guide"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    );
  }

  return (
    <>
      <EuiCallOut
        data-test-subj="IncomingDataConfirmedCallOut"
        title={i18n.translate('xpack.fleet.confirmIncomingData.title', {
          defaultMessage:
            'Incoming data received from {numAgentsWithData} of {enrolledAgents} recently enrolled { enrolledAgents, plural, one {agent} other {agents}}.',
          values: {
            numAgentsWithData,
            enrolledAgents,
          },
        })}
        color="success"
        iconType="check"
      />
      {installedPolicy && (
        <>
          <EuiSpacer size="m" />
          <EuiText size="s">{message}</EuiText>
          <EuiSpacer size="m" />
          <EuiButton
            href={linkButton.href}
            isDisabled={isLoading}
            color="primary"
            fill
            data-test-subj="IncomingDataConfirmedButton"
          >
            {linkButton.text}
          </EuiButton>
        </>
      )}
    </>
  );
};
