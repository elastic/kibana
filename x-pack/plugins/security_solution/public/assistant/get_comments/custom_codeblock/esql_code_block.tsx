/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import type { UseChatSend } from '@kbn/elastic-assistant/impl/assistant/chat_send/use_chat_send';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect } from 'react';
import { VisualizeESQL } from '@kbn/observability-ai-assistant-app-plugin/public';
import { lastValueFrom } from 'rxjs';
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../../../common/lib/kibana';

export function EsqlCodeBlock({
  value,
  actionsDisabled,
  handleSendMessage,
  ...rest
}: {
  value: string;
  actionsDisabled: boolean;
  handleSendMessage: UseChatSend['handleSendMessage'];
}) {
  console.error('value', value);
  console.error('rest', rest);
  const { lens, dataViews, uiActions, data } = useKibana().services;
  console.error('sss', useKibana(), useKibana().services.expressions.getTypes());
  const theme = useEuiTheme();

  const { data: columns } = useQuery({
    queryFn: async () => {
      return lastValueFrom(
        data.search.search(
          {
            params: {
              query: value,
              version: '2024.04.01',
              dropNullColumns: true,
            },
          },
          {
            strategy: 'esql_async',
            isSearchStored: false,
          }
        )
      );
    },
    select: (dataz) => {
      console.error('dataz', dataz);
      return dataz.rawResponse.columns.map((column) => ({
        id: column.name,
        name: column.name,
        meta: {
          type: column.type === 'long' ? 'number' : column.type,
        },
      }));
    },
    keepPreviousData: true,
  });

  console.error('columns', columns, [
    {
      id: 'count',
      name: 'count',
      meta: {
        type: 'number',
      },
    },
    {
      id: 'minute',
      name: 'minute',
      meta: {
        type: 'date',
      },
    },
  ]);

  return (
    <>
      <EuiPanel
        hasShadow={false}
        hasBorder={false}
        paddingSize="s"
        className={css`
          background-color: ${theme.euiTheme.colors.lightestShade};
          .euiCodeBlock__pre {
            margin-bottom: 0;
            padding: ${theme.euiTheme.size.m};
            min-block-size: 48px;
          }
          .euiCodeBlock__controls {
            inset-block-start: ${theme.euiTheme.size.m};
            inset-inline-end: ${theme.euiTheme.size.m};
          }
        `}
      >
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiCodeBlock isCopyable fontSize="m">
              {value}
            </EuiCodeBlock>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup direction="row" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="observabilityAiAssistantEsqlCodeBlockRunThisQueryButton"
                  size="xs"
                  iconType="play"
                  onClick={
                    () => {}
                    // onActionClick({ type: ChatActionClickType.executeEsqlQuery, query: value })
                  }
                  disabled={actionsDisabled}
                >
                  {i18n.translate('xpack.observabilityAiAssistant.runThisQuery', {
                    defaultMessage: 'Display results',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="observabilityAiAssistantEsqlCodeBlockVisualizeThisQueryButton"
                  size="xs"
                  iconType="lensApp"
                  // onClick={handleDisplayResults}
                  disabled={actionsDisabled}
                >
                  {i18n.translate('xpack.observabilityAiAssistant.visualizeThisQuery', {
                    defaultMessage: 'Visualize this query',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <VisualizeESQL
        lens={lens}
        dataViews={dataViews}
        uiActions={uiActions}
        columns={columns}
        onActionClick={() => {}}
        ObservabilityAIAssistantMultipaneFlyoutContext={{}}
        query={value.trim()}
        esqlInlineEditRef={rest.esqlInlineEditRef.current}
      />
    </>
  );
}
