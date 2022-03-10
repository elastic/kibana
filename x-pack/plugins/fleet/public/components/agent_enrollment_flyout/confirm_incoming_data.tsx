/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useGetAgentIncomingData } from '../../hooks';
interface Props {
  agentsIds: string[];
}

export const ConfirmIncomingData: React.FunctionComponent<Props> = ({ agentsIds }) => {
  const { enrolledAgents, agentsWithData, isLoading } = useGetAgentIncomingData(agentsIds);

  if (isLoading) {
    return (
      <EuiText size="s">
        {i18n.translate('xpack.fleet.confirmIncomingData.loading', {
          defaultMessage:
            'It may take a few minutes for data to arrive in Elasticsearch. If the system is not generating data, it may help to generate some to ensure data is being collected correctly. If you’re having trouble, see our troubleshooting guide. You may close this dialog and check later by viewing our integration assets.',
        })}
      </EuiText>
    );
  }

  return (
    <>
      <EuiCallOut
        data-test-subj="IncomingDataConfirmedCallOut"
        title={i18n.translate('xpack.fleet.confirmIncomingData.title', {
          defaultMessage:
            'Incoming data received from {agentsWithData} of {enrolledAgents} recently enrolled { enrolledAgents, plural, one {agent} other {agents}}.',
          values: {
            agentsWithData,
            enrolledAgents,
          },
        })}
        color="success"
        iconType="check"
      />
      <EuiSpacer size="m" />
      <EuiText size="s">
        {i18n.translate('xpack.fleet.confirmIncomingData.subtitle', {
          defaultMessage: 'Your agent is enrolled successfully and your data is received.',
        })}
      </EuiText>
    </>
  );
};
