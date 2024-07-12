/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiPanel,
  EuiSkeletonRectangle,
  EuiSkeletonText,
  EuiSpacer,
  EuiSteps,
  EuiStepStatus,
} from '@elastic/eui';
import useEvent from 'react-use/lib/useEvent';
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
      title: 'Install Elastic Agent on your host',
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
      title: 'Monitor your Kubernetes cluster',
      status: (isMonitoringStepActive ? 'current' : 'incomplete') as EuiStepStatus,
      children: isMonitoringStepActive && <DataIngestStatus onboardingId={data.onboardingId} />,
    },
  ];

  return (
    <EuiPanel hasBorder paddingSize="xl">
      <EuiSteps steps={steps} />
    </EuiPanel>
  );
};
