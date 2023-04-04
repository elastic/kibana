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

import { euiStyled } from '@kbn/kibana-react-plugin/common';
import type { ResponseActionExecuteOutputContent } from '../../../../common/endpoint/types';
import { getEmptyValue } from '../../../common/components/empty_value';

const emptyValue = getEmptyValue();

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

const SHELL_INFO = Object.freeze({
  shell: i18n.translate('xpack.securitySolution.responseActionExecuteAccordion.shellInformation', {
    defaultMessage: 'Shell',
  }),

  returnCode: i18n.translate(
    'xpack.securitySolution.responseActionExecuteAccordion.shellReturnCode',
    {
      defaultMessage: 'Return code',
    }
  ),
  currentDir: i18n.translate(
    'xpack.securitySolution.responseActionExecuteAccordion.currentWorkingDirectory',
    {
      defaultMessage: 'Current working directory',
    }
  ),
});

const StyledEuiText = euiStyled(EuiText)`
  white-space: pre-wrap;
  line-break: anywhere;
`;

interface ShellInfoContentProps {
  content: string | number;
  textSize?: 's' | 'xs';
  title: string;
}
const ShellInfoContent = memo<ShellInfoContentProps>(({ content, textSize, title }) => (
  <StyledEuiText size={textSize}>
    <strong>
      {title}
      {': '}
    </strong>
    {content}
  </StyledEuiText>
));

ShellInfoContent.displayName = 'ShellInfoContent';

interface ExecuteActionOutputProps {
  content?: string;
  initialIsOpen?: boolean;
  isTruncated?: boolean;
  textSize?: 's' | 'xs';
  type: 'error' | 'output';
}

const ExecutionActionOutputAccordion = memo<ExecuteActionOutputProps>(
  ({ content = emptyValue, initialIsOpen = false, isTruncated = false, textSize, type }) => {
    const id = useGeneratedHtmlId({
      prefix: 'executeActionOutputAccordions',
      suffix: type,
    });
    return (
      <EuiAccordion
        id={id}
        initialIsOpen={initialIsOpen}
        buttonContent={
          <EuiText size={textSize}>
            <strong>{ACCORDION_BUTTON_TEXT[type][isTruncated ? 'truncated' : 'regular']}</strong>
          </EuiText>
        }
        paddingSize="s"
      >
        <StyledEuiText size={textSize}>
          <p>{content}</p>
        </StyledEuiText>
      </EuiAccordion>
    );
  }
);
ExecutionActionOutputAccordion.displayName = 'ExecutionActionOutputAccordion';

export interface ExecuteActionHostResponseOutputProps {
  outputContent: ResponseActionExecuteOutputContent;
  'data-test-subj'?: string;
  textSize?: 's' | 'xs';
}

export const ExecuteActionHostResponseOutput = memo<ExecuteActionHostResponseOutputProps>(
  ({ outputContent, 'data-test-subj': dataTestSubj, textSize = 'xs' }) => (
    <>
      <EuiFlexItem data-test-subj={`${dataTestSubj}-shell`}>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem grow={false}>
            <ShellInfoContent
              title={SHELL_INFO.shell}
              content={outputContent.shell}
              textSize={textSize}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ShellInfoContent
              title={SHELL_INFO.returnCode}
              content={outputContent.shell_code}
              textSize={textSize}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem data-test-subj={`${dataTestSubj}-cwd`}>
        <EuiSpacer size="m" />
        <ShellInfoContent
          title={SHELL_INFO.currentDir}
          content={outputContent.cwd}
          textSize={textSize}
        />
      </EuiFlexItem>
      <EuiFlexItem data-test-subj={`${dataTestSubj}-output`}>
        <EuiSpacer size="m" />
        <ExecutionActionOutputAccordion
          content={outputContent.stdout.length ? outputContent.stdout : undefined}
          isTruncated={outputContent.stdout_truncated}
          initialIsOpen
          textSize={textSize}
          type="output"
        />
        <EuiSpacer size="m" />
        <ExecutionActionOutputAccordion
          content={outputContent.stderr.length ? outputContent.stderr : undefined}
          isTruncated={outputContent.stderr_truncated}
          textSize={textSize}
          type="error"
        />
      </EuiFlexItem>
    </>
  )
);
ExecuteActionHostResponseOutput.displayName = 'ExecuteActionHostResponseOutput';
