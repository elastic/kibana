/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonGroup,
  EuiLink,
  EuiPanel,
  EuiSkeletonRectangle,
  EuiSkeletonText,
  EuiSpacer,
  EuiStepStatus,
  EuiSteps,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { OnboardingFlowEventContext } from '../../../../common/telemetry_events';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { EmptyPrompt } from '../shared/empty_prompt';
import { FeedbackButtons } from '../shared/feedback_buttons';
import { CreateStackCommandSnippet } from './create_stack_command_snippet';
import { CreateStackInAWSConsole } from './create_stack_in_aws_console';
import { CreateStackOption } from './types';
import { useFirehoseFlow } from './use_firehose_flow';
import { VisualizeData } from './visualize_data';
import { ObservabilityOnboardingAppServices } from '../../..';
import { useWindowBlurDataMonitoringTrigger } from '../shared/use_window_blur_data_monitoring_trigger';
import { ExistingDataCallout } from './existing_data_callout';
import { usePopulatedAWSIndexList } from './use_populated_aws_index_list';

const OPTIONS = [
  {
    id: CreateStackOption.AWS_CONSOLE_UI,
    label: i18n.translate(
      'xpack.observability_onboarding.firehosePanel.createStackAWSConsoleOptionLabel',
      {
        defaultMessage: 'Via AWS Console',
      }
    ),
  },
  {
    id: CreateStackOption.AWS_CLI,
    label: i18n.translate(
      'xpack.observability_onboarding.firehosePanel.createStackAWSCLIOptionLabel',
      { defaultMessage: 'Via AWS CLI' }
    ),
  },
];

export function FirehosePanel() {
  const [selectedOptionId, setSelectedOptionId] = useState<CreateStackOption>(
    CreateStackOption.AWS_CONSOLE_UI
  );
  const {
    services: {
      context: { cloudServiceProvider },
    },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const { data, status, error, refetch } = useFirehoseFlow();
  const { data: populatedAWSIndexList } = usePopulatedAWSIndexList();

  const hasExistingData = Array.isArray(populatedAWSIndexList) && populatedAWSIndexList.length > 0;

  const telemetryEventContext: OnboardingFlowEventContext = useMemo(
    () => ({
      firehose: {
        cloudServiceProvider,
        selectedCreateStackOption: selectedOptionId,
      },
    }),
    [cloudServiceProvider, selectedOptionId]
  );

  const isMonitoringData =
    useWindowBlurDataMonitoringTrigger({
      isActive: status === FETCH_STATUS.SUCCESS,
      onboardingFlowType: 'firehose',
      onboardingId: data?.onboardingId,
      telemetryEventContext,
    }) || hasExistingData;

  const onOptionChange = useCallback((id: string) => {
    setSelectedOptionId(id as CreateStackOption);
  }, []);

  if (error !== undefined) {
    return (
      <EmptyPrompt
        onboardingFlowType="firehose"
        error={error}
        telemetryEventContext={{
          firehose: { cloudServiceProvider },
        }}
        onRetryClick={refetch}
      />
    );
  }

  const steps = [
    {
      title: i18n.translate('xpack.observability_onboarding.firehosePanel.prerequisitesTitle', {
        defaultMessage: 'Prerequisites',
      }),
      children: (
        <>
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.observability_onboarding.firehosePanel.prerequisitesDescription"
                defaultMessage="You must have an active AWS account and the necessary permissions to create delivery streams."
              />
            </p>
            <p>
              <FormattedMessage
                id="xpack.observability_onboarding.firehosePanel.prerequisitesDocumentation"
                defaultMessage="{documentationLink} for more info."
                values={{
                  documentationLink: (
                    <EuiLink
                      data-test-subj="observabilityOnboardingFirehosePanelCheckTheDocumentationLink"
                      href="https://www.elastic.co/docs/current/integrations/awsfirehose"
                      external
                      target="_blank"
                    >
                      {i18n.translate(
                        'xpack.observability_onboarding.firehosePanel.documentationLinkLabel',
                        { defaultMessage: 'Check the documentation' }
                      )}
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiText>
        </>
      ),
    },
    {
      title: 'Create a Firehose delivery stream to ingest CloudWatch logs and metrics',
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
            <>
              <EuiButtonGroup
                legend={i18n.translate(
                  'xpack.observability_onboarding.firehosePanel.createStackOptionsLegend',
                  {
                    defaultMessage: 'Select a preferred option to create a CloudFormation stack',
                  }
                )}
                type="single"
                buttonSize="m"
                idSelected={selectedOptionId}
                onChange={onOptionChange}
                options={OPTIONS}
              />

              <EuiSpacer size="l" />

              {selectedOptionId === CreateStackOption.AWS_CONSOLE_UI && (
                <CreateStackInAWSConsole
                  templateUrl={data.templateUrl}
                  encodedApiKey={data.apiKeyEncoded}
                  elasticsearchUrl={data.elasticsearchUrl}
                  isPrimaryAction={!isMonitoringData}
                />
              )}

              {selectedOptionId === CreateStackOption.AWS_CLI && (
                <CreateStackCommandSnippet
                  templateUrl={data.templateUrl}
                  encodedApiKey={data.apiKeyEncoded}
                  elasticsearchUrl={data.elasticsearchUrl}
                  isCopyPrimaryAction={!isMonitoringData}
                />
              )}
            </>
          )}
        </>
      ),
    },
    {
      title: 'Visualize your data',
      status: (isMonitoringData ? 'current' : 'incomplete') as EuiStepStatus,
      children: isMonitoringData && data !== undefined && (
        <VisualizeData
          selectedCreateStackOption={selectedOptionId}
          onboardingId={data.onboardingId}
          hasExistingData={hasExistingData}
        />
      ),
    },
  ];

  return (
    <EuiPanel hasBorder paddingSize="xl">
      {hasExistingData && (
        <>
          <ExistingDataCallout />
          <EuiSpacer size="xl" />
        </>
      )}
      <EuiSteps steps={steps} />
      <FeedbackButtons flow="firehose" />
    </EuiPanel>
  );
}
