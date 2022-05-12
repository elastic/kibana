/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, ReactNode, useEffect, useState } from 'react';
import {
  EuiBasicTable,
  EuiFlexItem,
  EuiText,
  HorizontalAlignment,
  LEFT_ALIGNMENT,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { FieldDataRowProps } from '../../types/field_data_row';
import { kibanaFieldFormat, numberAsOrdinal } from '../../../utils';
import {
  MetricDistributionChart,
  MetricDistributionChartData,
  buildChartDataFromStats,
} from '../metric_distribution_chart';
import { TopValues } from '../../../top_values';
import { ExpandedRowFieldHeader } from '../expanded_row_field_header';
import { DocumentStatsTable } from './document_stats';
import { ExpandedRowContent } from './expanded_row_content';
import { ExpandedRowPanel } from './expanded_row_panel';

const METRIC_DISTRIBUTION_CHART_WIDTH = 260;
const METRIC_DISTRIBUTION_CHART_HEIGHT = 200;

interface SummaryTableItem {
  function: string;
  display: ReactNode;
  value: number | string | undefined | null;
}

export const NumberContent: FC<FieldDataRowProps> = ({ config, onAddFilter }) => {
  const { stats } = config;

  useEffect(() => {
    const chartData = buildChartDataFromStats(stats, METRIC_DISTRIBUTION_CHART_WIDTH);
    setDistributionChartData(chartData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const defaultChartData: MetricDistributionChartData[] = [];
  const [distributionChartData, setDistributionChartData] = useState(defaultChartData);

  if (stats === undefined) return null;
  const { min, median, max, distribution } = stats;
  const fieldFormat = 'fieldFormat' in config ? config.fieldFormat : undefined;

  const summaryTableItems = [
    {
      function: 'min',
      display: (
        <FormattedMessage
          id="xpack.dataVisualizer.dataGrid.fieldExpandedRow.numberContent.minLabel"
          defaultMessage="min"
        />
      ),
      value: kibanaFieldFormat(min, fieldFormat),
    },
    {
      function: 'median',
      display: (
        <FormattedMessage
          id="xpack.dataVisualizer.dataGrid.fieldExpandedRow.numberContent.medianLabel"
          defaultMessage="median"
        />
      ),
      value: kibanaFieldFormat(median, fieldFormat),
    },
    {
      function: 'max',
      display: (
        <FormattedMessage
          id="xpack.dataVisualizer.dataGrid.fieldExpandedRow.numberContent.maxLabel"
          defaultMessage="max"
        />
      ),
      value: kibanaFieldFormat(max, fieldFormat),
    },
  ];
  const summaryTableColumns = [
    {
      name: '',
      render: (summaryItem: { display: ReactNode }) => summaryItem.display,
      width: '25px',
      align: LEFT_ALIGNMENT as HorizontalAlignment,
    },
    {
      field: 'value',
      name: '',
      render: (v: string) => <strong>{v}</strong>,
      align: RIGHT_ALIGNMENT as HorizontalAlignment,
    },
  ];

  const summaryTableTitle = i18n.translate(
    'xpack.dataVisualizer.dataGrid.fieldExpandedRow.numberContent.summaryTableTitle',
    {
      defaultMessage: 'Summary',
    }
  );
  return (
    <ExpandedRowContent dataTestSubj={'dataVisualizerNumberContent'}>
      <DocumentStatsTable config={config} />
      <ExpandedRowPanel className={'dvSummaryTable__wrapper dvPanel__wrapper'} grow={1}>
        <ExpandedRowFieldHeader>{summaryTableTitle}</ExpandedRowFieldHeader>
        <EuiBasicTable<SummaryTableItem>
          className={'dvSummaryTable'}
          compressed
          items={summaryTableItems}
          columns={summaryTableColumns}
          tableCaption={summaryTableTitle}
          data-test-subj={'dataVisualizerNumberSummaryTable'}
        />
      </ExpandedRowPanel>

      {stats && (
        <TopValues
          stats={stats}
          fieldFormat={fieldFormat}
          barColor="success"
          compressed={true}
          onAddFilter={onAddFilter}
        />
      )}
      {distribution &&
        stats.distribution?.percentiles.length !== undefined &&
        stats.distribution?.percentiles.length > 2 && (
          <ExpandedRowPanel
            dataTestSubj={'dataVisualizerFieldDataMetricDistribution'}
            className="dvPanel__wrapper"
            grow={false}
          >
            <EuiFlexItem grow={false}>
              <ExpandedRowFieldHeader>
                <FormattedMessage
                  id="xpack.dataVisualizer.dataGrid.fieldExpandedRow.numberContent.distributionTitle"
                  defaultMessage="Distribution"
                />
              </ExpandedRowFieldHeader>
            </EuiFlexItem>

            <EuiFlexItem className={'metricDistributionChartContainer'}>
              <MetricDistributionChart
                width={METRIC_DISTRIBUTION_CHART_WIDTH}
                height={METRIC_DISTRIBUTION_CHART_HEIGHT}
                chartData={distributionChartData}
                fieldFormat={fieldFormat}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" textAlign={'center'}>
                <FormattedMessage
                  id="xpack.dataVisualizer.dataGrid.fieldExpandedRow.numberContent.displayingPercentilesLabel"
                  defaultMessage="Displaying {minPercent} - {maxPercent} percentiles"
                  values={{
                    minPercent: numberAsOrdinal(distribution.minPercentile),
                    maxPercent: numberAsOrdinal(distribution.maxPercentile),
                  }}
                />
              </EuiText>
            </EuiFlexItem>
          </ExpandedRowPanel>
        )}
    </ExpandedRowContent>
  );
};
