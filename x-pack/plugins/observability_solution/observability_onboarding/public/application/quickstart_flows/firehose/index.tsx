/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiSkeletonRectangle,
  EuiSkeletonText,
  EuiSpacer,
  EuiSteps,
  EuiStepStatus,
  EuiText,
} from '@elastic/eui';
import useEvent from 'react-use/lib/useEvent';
import { FormattedMessage } from '@kbn/i18n-react';
import { FIREHOSE_CLOUDFORMATION_TEMPLATE_URL } from '../../../../common/aws_firehose';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { EmptyPrompt } from '../shared/empty_prompt';
import { CreateStackCommandSnippet } from './create_stack_command_snippet';
import { VisualizeData } from './visualize_data';
import { CreateStackInAWSConsole } from './create_stack_in_aws_console';

enum CreateStackOption {
  AWS_CONSOLE_UI = 'createCloudFormationOptionAWSConsoleUI',
  AWS_CLI = 'createCloudFormationOptionAWSCLI',
}

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
  const [windowLostFocus, setWindowLostFocus] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<CreateStackOption>(
    CreateStackOption.AWS_CONSOLE_UI
  );
  const { data, status, error, refetch } = useFetcher(
    (callApi) => {
      return callApi('POST /internal/observability_onboarding/firehose/flow');
    },
    [],
    { showToastOnError: false }
  );

  useEvent('blur', () => setWindowLostFocus(true), window);

  const onOptionChange = useCallback((id: string) => {
    setSelectedOptionId(id as CreateStackOption);
  }, []);

  if (error !== undefined) {
    return <EmptyPrompt error={error} onRetryClick={refetch} />;
  }

  const isVisualizeStepActive =
    status === FETCH_STATUS.SUCCESS && data !== undefined && windowLostFocus;

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
                    defaultMessage:
                      'Select one an a preferred option to create a CloudFormation stack',
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
                  isPrimaryAction={!isVisualizeStepActive}
                />
              )}

              {selectedOptionId === CreateStackOption.AWS_CLI && (
                <CreateStackCommandSnippet
                  templateUrl={data.templateUrl}
                  encodedApiKey={data.apiKeyEncoded}
                  elasticsearchUrl={data.elasticsearchUrl}
                  isCopyPrimaryAction={!isVisualizeStepActive}
                />
              )}

              <EuiHorizontalRule />

              <EuiText>
                <p>
                  <FormattedMessage
                    id="xpack.observability_onboarding.firehosePanel.DownloadCloudFormationTemplateCaption"
                    defaultMessage="Download and edit the CloudFormation Template if necessary:"
                  />
                </p>
              </EuiText>

              <EuiSpacer size="s" />

              <EuiButtonEmpty
                data-test-subj="observabilityOnboardingFirehosePanelDownloadCloudFormationTemplateButton"
                href={FIREHOSE_CLOUDFORMATION_TEMPLATE_URL}
                download={true}
                iconType="download"
                flush="left"
              >
                {i18n.translate(
                  'xpack.observability_onboarding.firehosePanel.downloadCloudFormationTemplateButtonLabel',
                  { defaultMessage: 'Download CloudFormation Template' }
                )}
              </EuiButtonEmpty>
            </>
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
