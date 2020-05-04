/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiText, EuiButtonGroup, EuiSteps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  ShellEnrollmentInstructions,
  ManualInstructions,
} from '../../../../../components/enrollment_instructions';
import { useCore, useGetAgents, useGetOneEnrollmentAPIKey } from '../../../../../hooks';
import { Loading } from '../../../components';

interface Props {
  selectedAPIKeyId: string | undefined;
}
function useNewEnrolledAgents() {
  // New enrolled agents
  const [timestamp] = useState(new Date().toISOString());
  const agentsRequest = useGetAgents(
    {
      perPage: 100,
      page: 1,
      showInactive: false,
    },
    {
      pollIntervalMs: 3000,
    }
  );
  return React.useMemo(() => {
    if (!agentsRequest.data) {
      return [];
    }

    return agentsRequest.data.list.filter(agent => agent.enrolled_at >= timestamp);
  }, [agentsRequest.data, timestamp]);
}

export const EnrollmentInstructions: React.FunctionComponent<Props> = ({ selectedAPIKeyId }) => {
  const core = useCore();
  const [installType, setInstallType] = useState<'quickInstall' | 'manual'>('quickInstall');

  const apiKey = useGetOneEnrollmentAPIKey(selectedAPIKeyId);

  const newAgents = useNewEnrolledAgents();
  if (!apiKey.data) {
    return null;
  }

  return (
    <>
      <EuiButtonGroup
        color="primary"
        idSelected={
          installType === 'manual' ? 'instructionsManualInstall' : 'instructionsQuickInstall'
        }
        options={[
          {
            id: 'instructionsQuickInstall',
            label: i18n.translate('xpack.ingestManager.agentEnrollment.quickInstallTitle', {
              defaultMessage: 'Quick install',
            }),
          },
          {
            id: 'instructionsManualInstall',
            label: i18n.translate('xpack.ingestManager.agentEnrollment.installManuallyTitle', {
              defaultMessage: 'Install manually',
            }),
          },
        ]}
        onChange={() => {
          setInstallType(installType === 'manual' ? 'quickInstall' : 'manual');
        }}
        buttonSize="m"
        isFullWidth
      />
      <EuiSpacer size="l" />
      {installType === 'manual' ? (
        <ManualInstructions />
      ) : (
        <EuiSteps
          steps={[
            {
              title: i18n.translate('xpack.ingestManager.agentEnrollment.stepSetupAgents', {
                defaultMessage: 'Setup Elastic agent',
              }),
              children: (
                <ShellEnrollmentInstructions
                  apiKey={apiKey.data.item}
                  kibanaUrl={`${window.location.origin}${core.http.basePath.get()}`}
                />
              ),
            },
            {
              title: i18n.translate('xpack.ingestManager.agentEnrollment.stepTestAgents', {
                defaultMessage: 'Test Agents',
              }),
              children: (
                <EuiText textAlign="center" color="subdued">
                  {!newAgents.length ? (
                    <>
                      <Loading />
                      <FormattedMessage
                        id="xpack.ingestManager.agentEnrollment.testAgentLoadingMessage"
                        defaultMessage="Waiting for new agents to enroll"
                      />
                    </>
                  ) : (
                    <>
                      <FormattedMessage
                        id="xpack.ingestManager.agentEnrollment.newAgentsMessage"
                        defaultMessage="{count, plural, one {# new agent} other {# new agents}}."
                        values={{ count: newAgents.length }}
                      />
                    </>
                  )}
                </EuiText>
              ),
            },
          ]}
        />
      )}
    </>
  );
};
