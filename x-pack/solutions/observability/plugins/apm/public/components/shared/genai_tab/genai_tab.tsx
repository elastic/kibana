/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiDescriptionList, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { GenAiFields } from './get_genai_fields';
import { GenAiFieldValue } from './genai_field_value';
import { GenAiMessages } from './genai_messages';
import { GenAiSection } from './genai_section';

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

  // ── Summary pills ──────────────────────────────────────────────────────────
  const pills: PillProps[] = [];
  if (operationName) {
    pills.push({
      label: i18n.translate('xpack.apm.genAi.pill.operationName', {
        defaultMessage: 'Operation',
      }),
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

  // ── Details rows ───────────────────────────────────────────────────────────
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
  Object.entries(requestParams)
    .filter(([, v]) => v !== undefined)
    .forEach(([key, val]) => {
      extraParams.push({
        title: key,
        description: <GenAiFieldValue value={val} />,
      });
    });

  const hasConversation =
    inputMessages.length > 0 || outputMessages.length > 0 || !!systemInstructions;

  return (
    <>
      {/* ── Section 1: Summary ─────────────────────────────────────────── */}
      {pills.length > 0 && (
        <GenAiSection
          id="summary"
          title={i18n.translate('xpack.apm.genAi.section.summary', {
            defaultMessage: 'Summary',
          })}
        >
          <EuiFlexGroup gutterSize="xs" wrap data-test-subj="genAiPills">
            {pills.map((p) => (
              <EuiFlexItem grow={false} key={p.testSubj}>
                <Pill {...p} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </GenAiSection>
      )}

      {/* ── Section 2: Details ─────────────────────────────────────────── */}
      {extraParams.length > 0 && (
        <>
          <EuiSpacer size="m" />
          <GenAiSection
            id="details"
            title={i18n.translate('xpack.apm.genAi.section.details', {
              defaultMessage: 'Details',
            })}
          >
            <EuiDescriptionList
              type="column"
              columnWidths={[1, 3]}
              listItems={extraParams}
              data-test-subj="genAiDetails"
            />
          </GenAiSection>
        </>
      )}

      {/* ── Section 3: Conversation ────────────────────────────────────── */}
      {hasConversation && (
        <>
          <EuiSpacer size="m" />
          <GenAiSection
            id="conversation"
            title={i18n.translate('xpack.apm.genAi.section.conversation', {
              defaultMessage: 'Conversation',
            })}
          >
            <GenAiMessages
              inputMessages={inputMessages}
              outputMessages={outputMessages}
              systemInstructions={systemInstructions}
            />
          </GenAiSection>
        </>
      )}
    </>
  );
}
