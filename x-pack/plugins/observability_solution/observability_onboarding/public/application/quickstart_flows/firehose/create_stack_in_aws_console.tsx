/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import {
  FIREHOSE_CLOUDFORMATION_STACK_NAME,
  FIREHOSE_LOGS_STREAM_NAME,
  FIREHOSE_METRICS_STREAM_NAME,
} from '../../../../common/aws_firehose';
import { DownloadTemplateCallout } from './download_template_callout';
import { buildCreateStackAWSConsoleURL } from './utils';

interface Props {
  encodedApiKey: string;
  elasticsearchUrl: string;
  templateUrl: string;
  isPrimaryAction: boolean;
}

export function CreateStackInAWSConsole({
  encodedApiKey,
  elasticsearchUrl,
  templateUrl,
  isPrimaryAction,
}: Props) {
  const awsConsoleURL = buildCreateStackAWSConsoleURL({
    templateUrl,
    stackName: FIREHOSE_CLOUDFORMATION_STACK_NAME,
    logsStreamName: FIREHOSE_LOGS_STREAM_NAME,
    metricsStreamName: FIREHOSE_METRICS_STREAM_NAME,
    elasticsearchUrl,
    encodedApiKey,
  });

  return (
    <>
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.observability_onboarding.firehosePanel.createFirehoseStreamInAWSConsoleDescription"
            defaultMessage="Click the button below to create a CloudFormation stack from our template. The stack will include a Firehose delivery stream, backup S3 bucket, CloudWatch subscription filter, metrics stream, and necessary IAM roles. Keep this page open, and return once you've submitted the form in AWS Console"
          />
        </p>
        <p>
          <DownloadTemplateCallout />
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      <EuiButton
        data-test-subj="observabilityOnboardingCreateStackInAWSConsoleButton"
        href={awsConsoleURL}
        target="_blank"
        iconSide="right"
        iconType="popout"
        fill={isPrimaryAction}
      >
        {i18n.translate(
          'xpack.observability_onboarding.createStackInAWSConsole.createFirehoseStreamInAWSConsoleButtonLabel',
          { defaultMessage: 'Create Firehose Stream in AWS' }
        )}
      </EuiButton>
    </>
  );
}
