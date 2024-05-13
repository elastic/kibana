/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Axis, Chart, HistogramBarSeries, Position, ScaleType, Settings } from '@elastic/charts';
import type { BarStyleAccessor } from '@elastic/charts/dist/chart_types/xy_chart/utils/specs';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiInMemoryTable, EuiCode, EuiSpacer, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import type {
  RegisterRenderFunctionDefinition,
  RenderFunction,
} from '@kbn/observability-ai-assistant-plugin/public';
import { MULTILAYER_TIME_AXIS_STYLE } from '@kbn/charts-plugin/common';

import type { AiopsApiPluginStartDeps } from '../types';

import type { GetAiopsLogRateAnalysisFunctionResponse } from '../../common/types';

const LOG_RATE_ANALYSIS_HIGHLIGHT_COLOR = 'orange';
const SPEC_ID = 'document_count';
const NARROW_COLUMN_WIDTH = '120px';

const overallSeriesName = i18n.translate(
  'xpack.aiops.dataGrid.field.documentCountChart.seriesLabel',
  {
    defaultMessage: 'document count',
  }
);

export function registerLogRateAnalysisRenderFunction({
  registerRenderFunction,
  pluginsStart,
}: {
  registerRenderFunction: RegisterRenderFunctionDefinition;
  pluginsStart: AiopsApiPluginStartDeps;
}) {
  console.log('REGISTER FUNCTION');
  const renderFunction: RenderFunction<{}, GetAiopsLogRateAnalysisFunctionResponse> = ({
    arguments: args,
    response,
  }) => {
    console.log('response', response);

    if (typeof response.content === 'string') {
      return null;
    }

    // CHART

    const adjustedChartPoints = Object.entries(response.data.dateHistogram).map(
      ([time, value]) => ({
        time: Number(time),
        value,
      })
    );

    // const xAxisFormatter = fieldFormats.deserialize({ id: 'date' });
    const useLegacyTimeAxis = false;

    const barStyle = {
      rect: {
        opacity: 1,
        fill: LOG_RATE_ANALYSIS_HIGHLIGHT_COLOR,
      },
    };

    const extendedChangePoint = response.data.logRateChange.extendedChangePoint;

    // Used to highlight an auto-detected change point in the date histogram.
    const barStyleAccessor: BarStyleAccessor = (d, g) => {
      return g.specId === 'document_count' &&
        extendedChangePoint &&
        d.x > extendedChangePoint.startTs &&
        d.x < extendedChangePoint.endTs
        ? barStyle
        : null;
    };

    // TABLE

    const tableItems = response.content.significantItems;

    const columns: Array<EuiBasicTableColumn<typeof tableItems[0]>> = [
      {
        'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnFieldName',
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

    const sorting = {
      sort: {
        field: 'logIncrease',
        direction: 'desc' as const,
      },
    };

    return (
      <div css={{ width: '100%' }} data-test-subj={'aiopsDocumentCountChart'}>
        <Chart
          size={{
            width: '100%',
            height: 120,
          }}
        >
          <Settings
            // baseTheme={chartBaseTheme}
            baseTheme={undefined}
            showLegend={false}
            showLegendExtra={false}
            locale={i18n.getLocale()}
          />
          <Axis id="aiops-histogram-left-axis" position={Position.Left} ticks={2} integersOnly />
          <Axis
            id="aiops-histogram-bottom-axis"
            position={Position.Bottom}
            showOverlappingTicks={true}
            // tickFormat={(value) => xAxisFormatter.convert(value)}
            labelFormat={useLegacyTimeAxis ? undefined : () => ''}
            timeAxisLayerCount={useLegacyTimeAxis ? 0 : 2}
            style={useLegacyTimeAxis ? {} : MULTILAYER_TIME_AXIS_STYLE}
          />
          {adjustedChartPoints?.length && (
            <HistogramBarSeries
              id={SPEC_ID}
              name={overallSeriesName}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor="time"
              yAccessors={['value']}
              stackAccessors={['true']}
              data={adjustedChartPoints}
              // timeZone={timeZone}
              // color={barColor}
              yNice
              styleAccessor={barStyleAccessor}
            />
          )}
        </Chart>
        <EuiSpacer size="s" />
        <EuiInMemoryTable
          data-test-subj="aiopsLogRateAnalysisResultsTable"
          compressed
          columns={columns}
          items={tableItems}
          loading={false}
          sorting={sorting}
          pagination={{ initialPageSize: 5, pageSizeOptions: [5, 10, 20] }}
        />
        <EuiSpacer size="s" />
        <p>
          <small>
            More analysis options available in{' '}
            <a href={response.data.logRateAnalysisUILink}>Log Rate Analysis</a>.
          </small>
        </p>
      </div>
    );
  };
  registerRenderFunction('get_aiops_log_rate_analysis', renderFunction);
}
