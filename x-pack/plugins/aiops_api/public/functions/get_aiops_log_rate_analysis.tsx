/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiInMemoryTable, EuiCode, EuiSpacer, EuiText } from '@elastic/eui';

import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type {
  RegisterRenderFunctionDefinition,
  RenderFunction,
} from '@kbn/observability-ai-assistant-plugin/public';
import { SimpleDocumentCountChart, NARROW_COLUMN_WIDTH } from '@kbn/aiops-components';

import type { GetAiopsLogRateAnalysisFunctionResponse } from '../../common/types';

import type { AiopsApiPluginStartDeps } from '../types';

export function registerLogRateAnalysisRenderFunction({
  coreStart,
  registerRenderFunction,
  pluginsStart,
}: {
  coreStart: CoreStart;
  registerRenderFunction: RegisterRenderFunctionDefinition;
  pluginsStart: AiopsApiPluginStartDeps;
}) {
  const renderFunction: RenderFunction<{}, GetAiopsLogRateAnalysisFunctionResponse> = ({
    arguments: args,
    response,
  }) => {
    if (typeof response.content === 'string') {
      return null;
    }

    const tableItems = response.content.significantItems;

    const columns: Array<EuiBasicTableColumn<typeof tableItems[0]>> = [
      {
        'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnFieldName',
        width: NARROW_COLUMN_WIDTH,
        field: 'field',
        name: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.fieldNameLabel', {
          defaultMessage: 'Field name',
        }),
        render: (_, { field }) => {
          return (
            <span title={field} className="eui-textTruncate">
              {field}
            </span>
          );
        },
        sortable: true,
        valign: 'middle',
      },
      {
        'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnFieldValue',
        field: 'value',
        name: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.fieldValueLabel', {
          defaultMessage: 'Field value',
        }),
        render: (_, { value, type }) => (
          <span title={String(value)}>
            {type === 'metadata' ? (
              String(value)
            ) : (
              <EuiText size="xs">
                <EuiCode language="log" transparentBackground css={{ paddingInline: '0px' }}>
                  {String(value)}
                </EuiCode>
              </EuiText>
            )}
          </span>
        ),
        sortable: true,
        textOnly: true,
        truncateText: { lines: 3 },
        valign: 'middle',
      },
      {
        'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnDocCount',
        width: NARROW_COLUMN_WIDTH,
        field: 'logIncrease',
        name: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.docCountLabel', {
          defaultMessage: 'Increase',
        }),
        sortable: true,
        valign: 'middle',
      },
    ];

    return (
      <div css={{ width: '100%' }} data-test-subj={'aiopsDocumentCountChart'}>
        <SimpleDocumentCountChart
          dependencies={{
            charts: pluginsStart.charts,
            fieldFormats: pluginsStart.fieldFormats,
            uiSettings: coreStart.uiSettings,
          }}
          dateHistogram={response.data.dateHistogram}
          changePoint={{
            ...response.data.logRateChange.extendedChangePoint,
            key: 0,
            type: 'spike',
          }}
        />
        <EuiSpacer size="s" />
        <EuiInMemoryTable
          data-test-subj="aiopsLogRateAnalysisResultsTable"
          compressed
          columns={columns}
          items={tableItems.splice(0, 5)}
          loading={false}
          sorting={false}
          pagination={false}
        />
        <EuiSpacer size="s" />
        <p>
          <small>
            Showing the top 5 statistically significant log rate change contributors. A view with
            all results is available in{' '}
            <a href={response.data.logRateAnalysisUILink}>Log Rate Analysis</a>. The AI assistant
            considers all results.
          </small>
        </p>
      </div>
    );
  };
  registerRenderFunction('get_aiops_log_rate_analysis', renderFunction);
}
