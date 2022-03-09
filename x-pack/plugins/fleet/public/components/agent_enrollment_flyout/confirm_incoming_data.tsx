/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiCallOut, EuiButton, EuiText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { IncomingDataList } from '../../../public/applications/fleet/types';
import { sendGetAgentIncomingData } from '../../hooks';
interface Props {
  agentsIds: string[];
}

export const ConfirmIncomingData: React.FunctionComponent<Props> = ({ agentsIds }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [incomingData, setIncomingData] = useState<IncomingDataList[]>([]);

  useEffect(() => {
    const getIncomingData = async () => {
      const { data } = await sendGetAgentIncomingData({ agentsIds });
      if (data?.items) {
        setIncomingData(data?.items);
        setIsLoading(false);
      }
    };
    if (agentsIds) {
      getIncomingData();
    }
  }, [agentsIds]);

  const enrolledAgents = incomingData.length;
  const agentsWithData = incomingData.reduce((acc, curr) => {
    const agentData = Object.values(curr)[0];
    return !!agentData.data ? acc + 1 : acc;
  }, 0);

  return (
    <>
      {isLoading ? (
        <>
          <EuiText size="s">
            {i18n.translate('xpack.fleet.confirmIncomingData.loading', {
              defaultMessage:
                'It may take a few minutes for data to arrive in Elasticsearch. If the system is not generating data, it may help to generate some to ensure data is being collected correctly. If you’re having trouble, see our troubleshooting guide. You may close this dialog and check later by viewing our integration assets.',
            })}
          </EuiText>
          <EuiSpacer size="m" />
        </>
      ) : (
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
          <EuiSpacer size="m" />
        </>
      )}
      <EuiButton
        href="Link"
        color="primary"
        fill
        data-test-subj="IncomingDataConfirmedButton"
        isDisabled={isLoading}
      >
        {i18n.translate('xpack.fleet.confirmIncomingData.button', {
          defaultMessage: `View incoming data`,
        })}
      </EuiButton>
    </>
  );
};
