/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiAccordion,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { ACCORDION_BUTTON_TEXT, emptyValue, EXECUTE_OUTPUT_FILE_TRUNCATED_MESSAGE } from './utils';
import { StyledEuiText } from './shell_info_content';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import type { ResponseActionExecuteOutputContent } from '../../../../common/endpoint/types';

interface ExecuteActionOutputProps {
  content?: string | React.ReactNode;
  initialIsOpen?: boolean;
  isTruncated?: boolean;
  isFileTruncated?: boolean;
  textSize?: 's' | 'xs';
  type: 'error' | 'output' | 'context';
  'data-test-subj'?: string;
}

const ExecutionActionOutputAccordion = memo<ExecuteActionOutputProps>(
  ({
    content = emptyValue,
    initialIsOpen = false,
    isTruncated = false,
    isFileTruncated = false,
    textSize,
    type,
    'data-test-subj': dataTestSubj,
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const id = useGeneratedHtmlId({
      prefix: 'executeActionOutputAccordions',
      suffix: type,
    });

    const accordionButtonContent = useMemo(
      () => (
        <EuiText size={textSize} data-test-subj={getTestId('title')}>
          {type !== 'context'
            ? isTruncated
              ? ACCORDION_BUTTON_TEXT[type].truncated
              : ACCORDION_BUTTON_TEXT[type].regular
            : ACCORDION_BUTTON_TEXT[type]}
        </EuiText>
      ),
      [getTestId, isTruncated, textSize, type]
    );

    return (
      <EuiAccordion
        id={id}
        initialIsOpen={initialIsOpen}
        buttonContent={accordionButtonContent}
        paddingSize="s"
        data-test-subj={dataTestSubj}
      >
        <StyledEuiText size={textSize}>
          {isFileTruncated && (
            <>
              <EuiTextColor color="warning" data-test-subj={getTestId('fileTruncatedMsg')}>
                {EXECUTE_OUTPUT_FILE_TRUNCATED_MESSAGE}
              </EuiTextColor>
              <EuiSpacer size="m" />
            </>
          )}
          {typeof content === 'string' ? <p>{content}</p> : content}
        </StyledEuiText>
      </EuiAccordion>
    );
  }
);
ExecutionActionOutputAccordion.displayName = 'ExecutionActionOutputAccordion';

export interface ExecuteActionHostResponseOutputSimpleProps {
  outputContent: ResponseActionExecuteOutputContent;
  'data-test-subj'?: string;
  textSize?: 's' | 'xs';
}

export const ExecuteActionHostResponseOutputSimple =
  memo<ExecuteActionHostResponseOutputSimpleProps>(
    ({ outputContent, 'data-test-subj': dataTestSubj, textSize = 'xs' }) => {
      return (
        <>
          <EuiFlexItem>
            {outputContent.stderr?.length > 0 && (
              <>
                <EuiSpacer size="m" />
                <ExecutionActionOutputAccordion
                  content={outputContent.stderr?.length ? outputContent.stderr : undefined}
                  data-test-subj={`${dataTestSubj}-error`}
                  isTruncated={outputContent.stderr_truncated}
                  isFileTruncated={outputContent.output_file_stderr_truncated}
                  textSize={textSize}
                  initialIsOpen
                  type="error"
                />
              </>
            )}
            <EuiSpacer size="m" />
            <ExecutionActionOutputAccordion
              content={outputContent.stdout?.length ? outputContent.stdout : undefined}
              data-test-subj={`${dataTestSubj}-output`}
              isTruncated={outputContent.stdout_truncated}
              isFileTruncated={outputContent.output_file_stdout_truncated}
              initialIsOpen
              textSize={textSize}
              type="output"
            />
          </EuiFlexItem>
        </>
      );
    }
  );
ExecuteActionHostResponseOutputSimple.displayName = 'ExecuteActionHostResponseOutputSimple';
