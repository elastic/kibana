/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { css } from '@emotion/react';
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

interface DetailRow {
  id: string;
  label: React.ReactNode;
  content: React.ReactNode;
}

// Match Discover's result-panel table style: row separators only, no border on first/last row.
const detailTableCss = css`
  thead {
    display: none;
  }
  tr:first-child td {
    border-top: none;
  }
  tr:last-child td {
    border-bottom: none;
  }
`;

const DETAIL_COLUMNS: Array<EuiBasicTableColumn<DetailRow>> = [
  {
    field: 'label' as const,
    name: 'Field',
    width: '160px',
    render: (label: React.ReactNode) => (
      <EuiText size="xs">
        <strong>{label}</strong>
      </EuiText>
    ),
  },
  {
    field: 'content' as const,
    name: 'Value',
    render: (content: React.ReactNode) => content,
  },
];

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
  const detailRows: DetailRow[] = [];

  if (responseModel) {
    detailRows.push({
      id: 'responseModel',
      label: i18n.translate('xpack.apm.genAi.params.responseModel', {
        defaultMessage: 'Response model',
      }),
      content: <GenAiFieldValue value={responseModel} />,
    });
  }
  if (conversationId) {
    detailRows.push({
      id: 'conversationId',
      label: i18n.translate('xpack.apm.genAi.params.conversationId', {
        defaultMessage: 'Conversation ID',
      }),
      content: <GenAiFieldValue value={conversationId} />,
    });
  }
  if (response.id) {
    detailRows.push({
      id: 'responseId',
      label: i18n.translate('xpack.apm.genAi.params.responseId', {
        defaultMessage: 'Response ID',
      }),
      content: <GenAiFieldValue value={response.id} />,
    });
  }
  if (response.finish_reasons?.length) {
    detailRows.push({
      id: 'finishReasons',
      label: i18n.translate('xpack.apm.genAi.params.finishReasons', {
        defaultMessage: 'Finish reasons',
      }),
      content: <GenAiFieldValue value={response.finish_reasons} />,
    });
  }
  Object.entries(requestParams)
    .filter(([, v]) => v !== undefined)
    .forEach(([key, val]) => {
      detailRows.push({ id: key, label: key, content: <GenAiFieldValue value={val} /> });
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
      {detailRows.length > 0 && (
        <>
          <EuiSpacer size="m" />
          <GenAiSection
            id="details"
            title={i18n.translate('xpack.apm.genAi.section.details', {
              defaultMessage: 'Details',
            })}
          >
            <EuiBasicTable
              itemId="id"
              tableLayout="auto"
              compressed
              items={detailRows}
              columns={DETAIL_COLUMNS}
              data-test-subj="genAiDetails"
              css={detailTableCss}
              tableCaption={i18n.translate('xpack.apm.genAi.section.details.tableCaption', {
                defaultMessage: 'GenAI details',
              })}
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
