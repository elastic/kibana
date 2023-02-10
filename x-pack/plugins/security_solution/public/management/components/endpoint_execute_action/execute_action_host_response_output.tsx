/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useMemo } from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ResponseActionFileDownloadLink } from '../response_action_file_download_link';
import type {
  ActionDetails,
  MaybeImmutable,
  ResponseActionExecuteOutputContent,
} from '../../../../common/endpoint/types';

const EXECUTE_FILE_LINK_TITLE = i18n.translate(
  'xpack.securitySolution.responseActionExecuteDownloadLink.downloadButtonLabel',
  { defaultMessage: 'Click here to download full output' }
);

const ACCORDION_BUTTON_TEXT = Object.freeze({
  output: {
    regular: i18n.translate(
      'xpack.securitySolution.responseActionExecuteAccordion.outputButtonTextRegular',
      {
        defaultMessage: 'Execution output',
      }
    ),
    truncated: i18n.translate(
      'xpack.securitySolution.responseActionExecuteAccordion.outputButtonTextTruncated',
      {
        defaultMessage: 'Execution output (truncated)',
      }
    ),
  },
  error: {
    regular: i18n.translate(
      'xpack.securitySolution.responseActionExecuteAccordion.errorButtonTextRegular',
      {
        defaultMessage: 'Execution error',
      }
    ),
    truncated: i18n.translate(
      'xpack.securitySolution.responseActionExecuteAccordion.errorButtonTextTruncated',
      {
        defaultMessage: 'Execution error (truncated)',
      }
    ),
  },
});
interface ExecuteActionOutputProps {
  content: string;
  initialIsOpen?: boolean;
  isTruncated: boolean;
  type: 'error' | 'output';
}

const ExecutionActionOutputAccordion = memo<ExecuteActionOutputProps>(
  ({ content, initialIsOpen = false, isTruncated, type }) => {
    const id = useGeneratedHtmlId({
      prefix: 'executeActionOutputAccordions',
      suffix: type,
    });
    return (
      <EuiAccordion
        id={id}
        initialIsOpen={initialIsOpen}
        buttonContent={ACCORDION_BUTTON_TEXT[type][isTruncated ? 'truncated' : 'regular']}
        paddingSize="s"
      >
        <EuiText
          size="s"
          style={{
            whiteSpace: 'pre-wrap',
            lineBreak: 'anywhere',
          }}
        >
          <p>{content}</p>
        </EuiText>
      </EuiAccordion>
    );
  }
);
ExecutionActionOutputAccordion.displayName = 'ExecutionActionOutputAccordion';

interface ExecuteActionHostResponseOutputProps {
  action: MaybeImmutable<ActionDetails>;
  agentId?: string;
  'data-test-subj'?: string;
  textSize?: 's' | 'xs';
}

export const ExecuteActionHostResponseOutput = memo<ExecuteActionHostResponseOutputProps>(
  ({ action, agentId = action.agents[0], 'data-test-subj': dataTestSubj, textSize }) => {
    const outputContent = useMemo(
      () =>
        action.outputs &&
        action.outputs[agentId] &&
        (action.outputs[agentId].content as ResponseActionExecuteOutputContent),
      [agentId, action]
    );

    return (
      <EuiFlexGroup direction="column" data-test-subj={dataTestSubj}>
        <EuiFlexItem>
          <ResponseActionFileDownloadLink
            action={action}
            buttonTitle={EXECUTE_FILE_LINK_TITLE}
            textSize={textSize}
          />
        </EuiFlexItem>

        {outputContent && (
          <EuiFlexItem>
            <ExecutionActionOutputAccordion
              content={outputContent.stdout}
              isTruncated={outputContent.stdoutTruncated}
              initialIsOpen
              type="output"
            />
            <EuiSpacer size="m" />
            <ExecutionActionOutputAccordion
              content={outputContent.stderr}
              isTruncated={outputContent.stderrTruncated}
              type="error"
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);
ExecuteActionHostResponseOutput.displayName = 'ExecuteActionHostResponseOutput';
