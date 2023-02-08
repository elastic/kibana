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

interface ExecuteActionOutputProps {
  content: string;
  id: string;
  initialIsOpen?: boolean;
  type: 'output' | 'error';
}

const ExecutionActionOutputGist = memo<ExecuteActionOutputProps>(
  ({ content, id, initialIsOpen = false, type }) => {
    return (
      <EuiAccordion
        id={id}
        initialIsOpen={initialIsOpen}
        buttonContent={i18n.translate(
          'xpack.securitySolution.responseActionExecuteAccordion.buttonText',
          {
            values: { type },
            defaultMessage: 'Execution {type} (truncated)',
          }
        )}
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
              initialIsOpen
              type="output"
            />
            <EuiSpacer size="m" />
            <ExecutionActionOutputGist
              content={outputs[agentId].content.stderr}
              id={executionOutputAccordionStderr}
              type="error"
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);
ExecuteAction.displayName = 'ExecuteAction';
