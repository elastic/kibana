/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, ReactNode, useEffect, useState } from 'react';
import { EuiBasicTable, EuiFlexItem, EuiText } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
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

const METRIC_DISTRIBUTION_CHART_WIDTH = 325;
const METRIC_DISTRIBUTION_CHART_HEIGHT = 200;

interface SummaryTableItem {
  function: string;
  display: ReactNode;
  value: number | string | undefined | null;
}

export const NumberContent: FC<FieldDataRowProps> = ({ config }) => {
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
          id="xpack.fileDataVisualizer.fieldDataCardExpandedRow.numberContent.minLabel"
          defaultMessage="min"
        />
      ),
      value: kibanaFieldFormat(min, fieldFormat),
    },
    {
      function: 'median',
      display: (
        <FormattedMessage
          id="xpack.fileDataVisualizer.fieldDataCardExpandedRow.numberContent.medianLabel"
          defaultMessage="median"
        />
      ),
      value: kibanaFieldFormat(median, fieldFormat),
    },
    {
      function: 'max',
      display: (
        <FormattedMessage
          id="xpack.fileDataVisualizer.fieldDataCardExpandedRow.numberContent.maxLabel"
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
      width: '75px',
    },
    {
      field: 'value',
      name: '',
      render: (v: string) => <strong>{v}</strong>,
    },
  ];

  const summaryTableTitle = i18n.translate(
    'xpack.fileDataVisualizer.fieldDataCardExpandedRow.numberContent.summaryTableTitle',
    {
      defaultMessage: 'Summary',
    }
  );
  return (
    <ExpandedRowContent dataTestSubj={'mlDVNumberContent'}>
      <DocumentStatsTable config={config} />
      <EuiFlexItem className={'dataVisualizerSummaryTableWrapper'}>
        <ExpandedRowFieldHeader>{summaryTableTitle}</ExpandedRowFieldHeader>
        <EuiBasicTable<SummaryTableItem>
          className={'dataVisualizerSummaryTable'}
          compressed
          items={summaryTableItems}
          columns={summaryTableColumns}
          tableCaption={summaryTableTitle}
          data-test-subj={'mlNumberSummaryTable'}
        />
      </EuiFlexItem>

      {stats && (
        <TopValues stats={stats} fieldFormat={fieldFormat} barColor="secondary" compressed={true} />
      )}
      {distribution && (
        <EuiFlexItem data-test-subj={'mlMetricDistribution'}>
          <EuiFlexItem grow={false}>
            <ExpandedRowFieldHeader>
              <FormattedMessage
                id="xpack.fileDataVisualizer.fieldDataCardExpandedRow.numberContent.distributionTitle"
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
            <EuiText size="xs">
              <FormattedMessage
                id="xpack.fileDataVisualizer.fieldDataCardExpandedRow.numberContent.displayingPercentilesLabel"
                defaultMessage="Displaying {minPercent} - {maxPercent} percentiles"
                values={{
                  minPercent: numberAsOrdinal(distribution.minPercentile),
                  maxPercent: numberAsOrdinal(distribution.maxPercentile),
                }}
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexItem>
      )}
    </ExpandedRowContent>
  );
};
