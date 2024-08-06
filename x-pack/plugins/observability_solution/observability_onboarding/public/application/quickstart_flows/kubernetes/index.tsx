/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiPanel,
  EuiSkeletonRectangle,
  EuiSkeletonText,
  EuiSpacer,
  EuiSteps,
  EuiStepStatus,
  EuiText,
} from '@elastic/eui';
import useEvent from 'react-use/lib/useEvent';
import { i18n } from '@kbn/i18n';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { EmptyPrompt } from '../shared/empty_prompt';
import { CommandSnippet } from './command_snippet';
import { DataIngestStatus } from './data_ingest_status';

export const KubernetesPanel: React.FC = () => {
  const [windowLostFocus, setWindowLostFocus] = useState(false);
  const { data, status, error, refetch } = useFetcher((callApi) => {
    return callApi('POST /internal/observability_onboarding/kubernetes/flow');
  }, []);

  useEvent('blur', () => setWindowLostFocus(true), window);

  if (error !== undefined) {
    return <EmptyPrompt error={error} onRetryClick={refetch} />;
  }

  const isMonitoringStepActive =
    status === FETCH_STATUS.SUCCESS && data !== undefined && windowLostFocus;

  const steps = [
    {
      title: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.kubernetes.installStepTitle',
        {
          defaultMessage: 'Install Elastic Agent on your Kubernetes cluster',
        }
      ),
      children: (
        <>
          {status !== FETCH_STATUS.SUCCESS && (
            <>
              <EuiSkeletonText lines={5} />
              <EuiSpacer />
              <EuiSkeletonRectangle width="170px" height="40px" />
            </>
          )}
          {status === FETCH_STATUS.SUCCESS && data !== undefined && (
            <CommandSnippet
              encodedApiKey={data.apiKeyEncoded}
              onboardingId={data.onboardingId}
              elasticsearchUrl={data.elasticsearchUrl}
              elasticAgentVersion={data.elasticAgentVersion}
              isCopyPrimaryAction={!isMonitoringStepActive}
            />
          )}
        </>
      ),
    },
    {
      title: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.kubernetes.monitorStepTitle',
        {
          defaultMessage: 'Monitor your Kubernetes cluster',
        }
      ),
      status: (isMonitoringStepActive ? 'current' : 'incomplete') as EuiStepStatus,
      children: isMonitoringStepActive && <DataIngestStatus onboardingId={data.onboardingId} />,
    },
    {
      title: 'Add more data',
      status: (isMonitoringStepActive ? 'current' : 'incomplete') as EuiStepStatus,
      children: isMonitoringStepActive ? (
        <>
          <EuiText>
            <p>
              {i18n.translate('xpack.observability_onboarding.autoDetectPanel.p.addMoreDataLabel', {
                defaultMessage:
                  'To add more integrations, go to the integrations page to install required assets and extend your configuration',
              })}
            </p>
          </EuiText>
          <EuiButton
            data-test-subj="observabilityOnboardingAutoDetectPanelGoToIntegrationsButton"
            fill
            href="/app/integrations"
          >
            {i18n.translate(
              'xpack.observability_onboarding.autoDetectPanel.goToIntegrationsButtonLabel',
              { defaultMessage: 'Go to integrations' }
            )}
          </EuiButton>
        </>
      ) : null,
    },
  ];

  return (
    <EuiPanel hasBorder paddingSize="xl">
      <EuiSteps steps={steps} />
    </EuiPanel>
  );
};
