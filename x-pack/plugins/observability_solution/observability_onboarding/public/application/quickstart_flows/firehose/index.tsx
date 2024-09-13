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
import { CreateStackCommandSnippet } from './create_stack_command_snippet';
import { VisualizeData } from './visualize_data';

export function FirehosePanel() {
  const [windowLostFocus, setWindowLostFocus] = useState(false);
  const { data, status, error, refetch } = useFetcher(
    (callApi) => {
      return callApi('POST /internal/observability_onboarding/firehose/flow');
    },
    [],
    { showToastOnError: false }
  );

  useEvent('blur', () => setWindowLostFocus(true), window);

  if (error !== undefined) {
    return <EmptyPrompt error={error} onRetryClick={refetch} />;
  }

  const isVisualizeStepActive =
    status === FETCH_STATUS.SUCCESS && data !== undefined && windowLostFocus;

  const steps = [
    {
      title: 'Create a Firehose delivery stream and ingest CloudWatch logs',
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
            <CreateStackCommandSnippet
              templateUrl={data.templateUrl}
              encodedApiKey={data.apiKeyEncoded}
              onboardingId={data.onboardingId}
              elasticsearchUrl={data.elasticsearchUrl}
              isCopyPrimaryAction={!isVisualizeStepActive}
            />
          )}
        </>
      ),
    },
    {
      title: 'Visualize your data',
      status: (isVisualizeStepActive ? 'current' : 'incomplete') as EuiStepStatus,
      children: isVisualizeStepActive && <VisualizeData />,
    },
  ];

  return (
    <EuiPanel hasBorder paddingSize="xl">
      <EuiSteps steps={steps} />
    </EuiPanel>
  );
}
