/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiCodeBlock,
  EuiLink,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  FIREHOSE_CLOUDFORMATION_STACK_NAME,
  FIREHOSE_LOGS_STREAM_NAME,
  FIREHOSE_METRICS_STREAM_NAME,
} from '../../../../common/aws_firehose';
import { CopyToClipboardButton } from '../shared/copy_to_clipboard_button';
import { buildCreateStackCommand, buildStackStatusCommand } from './utils';

interface Props {
  encodedApiKey: string;
  onboardingId: string;
  elasticsearchUrl: string;
  templateUrl: string;
  isCopyPrimaryAction: boolean;
}

export function CreateStackCommandSnippet({
  encodedApiKey,
  elasticsearchUrl,
  templateUrl,
  isCopyPrimaryAction,
}: Props) {
  const stackStatusAccordionId = useGeneratedHtmlId({ prefix: 'stackStatusAccordion' });
  const createStackCommand = buildCreateStackCommand({
    templateUrl,
    stackName: FIREHOSE_CLOUDFORMATION_STACK_NAME,
    logsStreamName: FIREHOSE_LOGS_STREAM_NAME,
    metricsStreamName: FIREHOSE_METRICS_STREAM_NAME,
    encodedApiKey,
    elasticsearchUrl,
  });
  const stackStatusCommand = buildStackStatusCommand({
    stackName: FIREHOSE_CLOUDFORMATION_STACK_NAME,
  });

  return (
    <>
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.observability_onboarding.firehosePanel.createFirehoseStreamDescription"
            defaultMessage="Run the command bellow in your terminal where you have {awsCLIInstallGuideLink} configured. The command will create a CloudFormation stack that includes a Firehose delivery, backup S3 bucket, CloudWatch subscription filter and metrics stream along with required IAM roles."
            values={{
              awsCLIInstallGuideLink: (
                <EuiLink
                  data-test-subj="observabilityOnboardingFirehosePanelAwsInstallGuideLink"
                  href="https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
                  external
                  target="_blank"
                >
                  {i18n.translate(
                    'xpack.observability_onboarding.firehosePanel.awsCLIInstallGuideLinkLabel',
                    { defaultMessage: 'AWS CLI' }
                  )}
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>

      <EuiSpacer />

      <EuiCodeBlock
        language="text"
        paddingSize="m"
        fontSize="m"
        data-test-subj="observabilityOnboardingFirehoseCreateStackCommand"
      >
        {createStackCommand}
      </EuiCodeBlock>

      <EuiSpacer />

      <CopyToClipboardButton textToCopy={createStackCommand} fill={isCopyPrimaryAction} />

      <EuiSpacer />

      <EuiAccordion id={stackStatusAccordionId} buttonContent="Check stack status">
        <EuiSpacer size="xs" />
        <EuiCodeBlock language="text" paddingSize="m" fontSize="m" isCopyable>
          {stackStatusCommand}
        </EuiCodeBlock>
      </EuiAccordion>
    </>
  );
}
