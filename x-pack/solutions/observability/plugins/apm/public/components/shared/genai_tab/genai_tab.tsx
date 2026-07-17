/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { GenAiFields } from './get_genai_fields';
import { GenAiFieldValue } from './genai_field_value';
import { GenAiMessages } from './genai_messages';

interface PillProps {
  label: string;
  value: string | number;
  testSubj?: string;
}

function Pill({ label, value, testSubj }: PillProps) {
  return (
    <EuiBadge color="hollow" data-test-subj={testSubj}>
      {label}: <strong>{value}</strong>
    </EuiBadge>
  );
}

interface Props {
  genAi: GenAiFields;
}

export function GenAiTab({ genAi }: Props) {
  const {
    operationName,
    requestModel,
    responseModel,
    provider,
    inputTokens,
    outputTokens,
    requestParams,
    response,
    inputMessages,
    outputMessages,
    systemInstructions,
    conversationId,
  } = genAi;

  const pills: PillProps[] = [];
  if (operationName) {
    pills.push({
      label: i18n.translate('xpack.apm.genAi.pill.operationName', { defaultMessage: 'Operation' }),
      value: operationName,
      testSubj: 'genAiPillOperationName',
    });
  }
  if (requestModel) {
    pills.push({
      label: i18n.translate('xpack.apm.genAi.pill.model', { defaultMessage: 'Model' }),
      value: requestModel,
      testSubj: 'genAiPillModel',
    });
  }
  if (provider) {
    pills.push({
      label: i18n.translate('xpack.apm.genAi.pill.provider', { defaultMessage: 'Provider' }),
      value: provider,
      testSubj: 'genAiPillProvider',
    });
  }
  if (inputTokens !== undefined) {
    pills.push({
      label: i18n.translate('xpack.apm.genAi.pill.inputTokens', {
        defaultMessage: 'Input tokens',
      }),
      value: inputTokens,
      testSubj: 'genAiPillInputTokens',
    });
  }
  if (outputTokens !== undefined) {
    pills.push({
      label: i18n.translate('xpack.apm.genAi.pill.outputTokens', {
        defaultMessage: 'Output tokens',
      }),
      value: outputTokens,
      testSubj: 'genAiPillOutputTokens',
    });
  }

  const extraParams: Array<{
    title: NonNullable<React.ReactNode>;
    description: NonNullable<React.ReactNode>;
  }> = [];

  if (responseModel) {
    extraParams.push({
      title: i18n.translate('xpack.apm.genAi.params.responseModel', {
        defaultMessage: 'Response model',
      }),
      description: <GenAiFieldValue value={responseModel} />,
    });
  }
  if (conversationId) {
    extraParams.push({
      title: i18n.translate('xpack.apm.genAi.params.conversationId', {
        defaultMessage: 'Conversation ID',
      }),
      description: <GenAiFieldValue value={conversationId} />,
    });
  }
  if (response.id) {
    extraParams.push({
      title: i18n.translate('xpack.apm.genAi.params.responseId', {
        defaultMessage: 'Response ID',
      }),
      description: <GenAiFieldValue value={response.id} />,
    });
  }
  if (response.finish_reasons?.length) {
    extraParams.push({
      title: i18n.translate('xpack.apm.genAi.params.finishReasons', {
        defaultMessage: 'Finish reasons',
      }),
      description: <GenAiFieldValue value={response.finish_reasons} />,
    });
  }

  const reqParamEntries = Object.entries(requestParams).filter(([, v]) => v !== undefined);
  if (reqParamEntries.length) {
    reqParamEntries.forEach(([key, val]) => {
      extraParams.push({
        title: key,
        description: <GenAiFieldValue value={val} />,
      });
    });
  }

  const hasConversation =
    inputMessages.length > 0 || outputMessages.length > 0 || !!systemInstructions;

  return (
    <>
      {pills.length > 0 && (
        <>
          <EuiFlexGroup gutterSize="s" wrap data-test-subj="genAiPills">
            {pills.map((p) => (
              <EuiFlexItem grow={false} key={p.testSubj}>
                <Pill {...p} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </>
      )}

      {extraParams.length > 0 && (
        <>
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate('xpack.apm.genAi.details.title', {
                defaultMessage: 'Details',
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiDescriptionList
            type="column"
            columnWidths={[1, 3]}
            listItems={extraParams}
            data-test-subj="genAiDetails"
          />
        </>
      )}

      {hasConversation && (
        <>
          <EuiHorizontalRule margin="m" />
          <GenAiMessages
            inputMessages={inputMessages}
            outputMessages={outputMessages}
            systemInstructions={systemInstructions}
          />
        </>
      )}
    </>
  );
}
