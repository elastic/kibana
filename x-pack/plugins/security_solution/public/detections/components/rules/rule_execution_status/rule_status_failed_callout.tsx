/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import { EuiButton, EuiCallOut, EuiCodeBlock } from '@elastic/eui';

import { NewChat } from '@kbn/elastic-assistant';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { RuleExecutionStatus } from '../../../../../common/api/detection_engine/rule_monitoring';

import * as i18n from './translations';
import * as i18nAssistant from '../../../pages/detection_engine/rules/translations';

interface RuleStatusFailedCallOutProps {
  date: string;
  message: string;
  status?: RuleExecutionStatus | null;
}

const RuleStatusFailedCallOutComponent: React.FC<RuleStatusFailedCallOutProps> = ({
  date,
  message,
  status,
}) => {
  const { shouldBeDisplayed, color, title } = getPropsByStatus(status);
  const getPromptContext = useCallback(async () => message, [message]);
  if (!shouldBeDisplayed) {
    return null;
  }

  return (
    <div
      css={`
        pre {
          margin-block-end: 0;
          margin-right: 24px; // Otherwise the copy button overlaps the scrollbar
          padding-inline-end: 0;
        }
      `}
    >
      <EuiCallOut
        title={
          <>
            {title} <FormattedDate value={date} fieldName="execution_summary.last_execution.date" />
          </>
        }
        color={color}
        iconType="warning"
        data-test-subj="ruleStatusFailedCallOut"
      >
        <EuiCodeBlock
          className="eui-fullWidth"
          paddingSize="none"
          isCopyable
          overflowHeight={96}
          transparentBackground
        >
          {message}
        </EuiCodeBlock>
        <EuiButton color={color} size="s">
          <NewChat
            category="detection-rules"
            color={color}
            conversationId={i18nAssistant.DETECTION_RULES_CONVERSATION_ID}
            description={"Rule's execution failure message"}
            getPromptContext={getPromptContext}
            suggestedUserPrompt={'Can you explain this rule execution error and steps to fix?'}
            tooltip={'Add this rule execution error as context'}
          >
            {'Ask Assistant'}
          </NewChat>
        </EuiButton>
      </EuiCallOut>
    </div>
  );
};

export const RuleStatusFailedCallOut = React.memo(RuleStatusFailedCallOutComponent);
RuleStatusFailedCallOut.displayName = 'RuleStatusFailedCallOut';

interface HelperProps {
  shouldBeDisplayed: boolean;
  color: 'danger' | 'warning';
  title: string;
}

const getPropsByStatus = (status: RuleExecutionStatus | null | undefined): HelperProps => {
  switch (status) {
    case RuleExecutionStatus.failed:
      return {
        shouldBeDisplayed: true,
        color: 'danger',
        title: i18n.ERROR_CALLOUT_TITLE,
      };
    case RuleExecutionStatus['partial failure']:
      return {
        shouldBeDisplayed: true,
        color: 'warning',
        title: i18n.PARTIAL_FAILURE_CALLOUT_TITLE,
      };
    default:
      return {
        shouldBeDisplayed: false,
        color: 'warning',
        title: '',
      };
  }
};
