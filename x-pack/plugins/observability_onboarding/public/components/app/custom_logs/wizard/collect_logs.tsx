/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiStepsProps,
} from '@elastic/eui';
import React, { useEffect, useCallback } from 'react';
import { useKibanaNavigation } from '../../../../hooks/use_kibana_navigation';
import { useWizard } from '.';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import {
  StepPanel,
  StepPanelContent,
  StepPanelFooter,
} from '../../../shared/step_panel';

export function CollectLogs() {
  const { navigateToKibanaUrl } = useKibanaNavigation();
  const { goToStep, goBack, getState, CurrentStep } = useWizard();

  function onInspect() {
    goToStep('inspect');
  }

  function onContinue() {
    navigateToKibanaUrl('/app/logs/stream');
  }

  function onBack() {
    goBack();
  }

  const { data, status, refetch } = useFetcher((callApi) => {
    if (CurrentStep === CollectLogs) {
      return callApi(
        'GET /internal/observability_onboarding/custom_logs/progress',
        {
          params: { query: { apiKeyId: getState().apiKeyId } },
        }
      );
    }
  }, []);

  const progressSucceded = status === FETCH_STATUS.SUCCESS;

  useEffect(() => {
    if (progressSucceded) {
      setTimeout(() => {
        refetch();
      }, 2000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressSucceded]);

  function getStepStatus(
    savedStatus: string | undefined
  ): EuiStepsProps['steps'][number]['status'] {
    if (savedStatus === undefined) {
      return 'incomplete';
    }
    return savedStatus as EuiStepsProps['steps'][number]['status'];
  }

  const getSteps = useCallback((): EuiStepsProps['steps'] => {
    const progress = data?.progress;
    const progressSteps = [
      {
        id: 'ea-download',
        incompleteTitle: 'Download Elastic Agent',
        loadingTitle: 'Downloading Elastic Agent',
        completedTitle: 'Elastic Agent downloaded',
      },
      {
        id: 'ea-extract',
        incompleteTitle: 'Extract Elastic Agent',
        loadingTitle: 'Extracting Elastic Agent',
        completedTitle: 'Elastic Agent extracted',
      },
      {
        id: 'ea-install',
        incompleteTitle: 'Install Elastic Agent',
        loadingTitle: 'Installing Elastic Agent',
        completedTitle: 'Elastic Agent installed',
      },
      {
        id: 'ea-status',
        incompleteTitle: 'Connect to the Elastic Agent',
        loadingTitle: 'Connecting to the Elastic Agent',
        completedTitle: 'Connected to the Elastic Agent',
      },
      {
        id: 'logs-ingest',
        incompleteTitle: 'Check for shipped logs',
        loadingTitle: 'Waiting for logs to be shipped',
        completedTitle: 'Logs are being shipped!',
      },
    ];
    return progressSteps.map(
      ({ id, incompleteTitle, loadingTitle, completedTitle }) => {
        const stepStatus = getStepStatus(progress?.[id]);
        const title =
          stepStatus === 'loading'
            ? loadingTitle
            : stepStatus === 'complete'
            ? completedTitle
            : incompleteTitle;
        return {
          title,
          children: null,
          status: stepStatus,
        };
      }
    );
  }, [data?.progress]);

  return (
    <StepPanel
      title=""
      panelFooter={
        <StepPanelFooter
          items={[
            <EuiButton color="ghost" fill onClick={onBack}>
              Back
            </EuiButton>,
            <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={onInspect}>Inspect</EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="success"
                  fill
                  iconType="magnifyWithPlus"
                  onClick={onContinue}
                >
                  Explore logs
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>,
          ]}
        />
      }
    >
      <StepPanelContent>
        <EuiText color="subdued">
          <p>
            It might take a few minutes for the data to get to Elastic. If
            you&apos;re not seeing any, try generating some to verify.
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiSteps titleSize="xs" steps={getSteps()} />
        <EuiHorizontalRule margin="l" />
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="help">Troubleshooting</EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </StepPanelContent>
    </StepPanel>
  );
}
