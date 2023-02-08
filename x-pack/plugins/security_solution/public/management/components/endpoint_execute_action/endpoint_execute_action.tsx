/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ResponseActionFileDownloadLink,
  type ResponseActionFileDownloadLinkProps,
} from '../response_action_file_download_link';
import type { ResponseActionExecuteOutputContent } from '../../../../common/endpoint/types';

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
  id: string;
  initialIsOpen?: boolean;
  isTruncated: boolean;
  type: 'error' | 'output';
}

const ExecutionActionOutputGist = memo<ExecuteActionOutputProps>(
  ({ content, id, initialIsOpen = false, isTruncated, type }) => {
    return (
      <EuiAccordion
        id={id}
        initialIsOpen={initialIsOpen}
        buttonContent={ACCORDION_BUTTON_TEXT[type][isTruncated ? 'truncated' : 'regular']}
        paddingSize="s"
      >
        <EuiText size="s">
          <p>{content}</p>
        </EuiText>
      </EuiAccordion>
    );
  }
);
ExecutionActionOutputGist.displayName = 'ExecutionActionOutputGist';

interface ExecuteActionProps {
  action: ResponseActionFileDownloadLinkProps['action'];
  agentId?: string;
  'data-test-subj'?: string;
  outputs?: Record<string, { content: ResponseActionExecuteOutputContent }>;
  textSize?: 's' | 'xs';
}

export const ExecuteAction = memo<ExecuteActionProps>(
  ({ action, agentId, 'data-test-subj': dataTestSubj, outputs, textSize }) => {
    const prefix = 'executeActionOutputAccordions';
    const executionOutputAccordionStdout = useGeneratedHtmlId({
      prefix,
      suffix: 'stdout',
    });
    const executionOutputAccordionStderr = useGeneratedHtmlId({
      prefix,
      suffix: 'stderr',
    });

    return (
      <EuiFlexGroup direction="column" data-test-subj={dataTestSubj}>
        <EuiFlexItem>
          <ResponseActionFileDownloadLink
            action={action}
            buttonTitle={EXECUTE_FILE_LINK_TITLE}
            textSize={textSize}
          />
        </EuiFlexItem>

        {/* TODO: add outputs to action list API when the tray is expanded */}
        {agentId && outputs && outputs[agentId] && (
          <EuiFlexItem>
            <ExecutionActionOutputGist
              content={outputs[agentId].content.stdout}
              id={executionOutputAccordionStdout}
              isTruncated={outputs[agentId].content.stdoutTruncated}
              initialIsOpen
              type="output"
            />
            <EuiSpacer size="m" />
            <ExecutionActionOutputGist
              content={outputs[agentId].content.stderr}
              id={executionOutputAccordionStderr}
              isTruncated={outputs[agentId].content.stderrTruncated}
              type="error"
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);
ExecuteAction.displayName = 'ExecuteAction';
