/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, ReactNode, useEffect, useState } from 'react';
import { EuiBasicTable, EuiFlexItem, EuiText } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import type { FieldDataRowProps } from '../../types/field_data_row';
import { kibanaFieldFormat } from '../../../../formatters/kibana_field_format';
import { numberAsOrdinal } from '../../../../formatters/number_as_ordinal';
import {
  MetricDistributionChart,
  MetricDistributionChartData,
  buildChartDataFromStats,
} from '../metric_distribution_chart';
import { TopValues } from '../../../index_based/components/field_data_row/top_values';
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
          id="xpack.ml.fieldDataCardExpandedRow.numberContent.minLabel"
          defaultMessage="min"
        />
      ),
      value: kibanaFieldFormat(min, fieldFormat),
    },
    {
      function: 'median',
      display: (
        <FormattedMessage
          id="xpack.ml.fieldDataCardExpandedRow.numberContent.medianLabel"
          defaultMessage="median"
        />
      ),
      value: kibanaFieldFormat(median, fieldFormat),
    },
    {
      function: 'max',
      display: (
        <FormattedMessage
          id="xpack.ml.fieldDataCardExpandedRow.numberContent.maxLabel"
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
    'xpack.ml.fieldDataCardExpandedRow.numberContent.summaryTableTitle',
    {
      defaultMessage: 'Summary',
    }
  );
  return (
    <ExpandedRowContent dataTestSubj={'mlDVNumberContent'}>
      <DocumentStatsTable config={config} />
      <EuiFlexItem className={'mlDataVisualizerSummaryTableWrapper'}>
        <ExpandedRowFieldHeader>{summaryTableTitle}</ExpandedRowFieldHeader>
        <EuiBasicTable<SummaryTableItem>
          className={'mlDataVisualizerSummaryTable'}
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
                id="xpack.ml.fieldDataCardExpandedRow.numberContent.distributionTitle"
                defaultMessage="Distribution"
              />
            </ExpandedRowFieldHeader>
          </EuiFlexItem>

          <EuiFlexItem className={'mlMetricDistributionChartContainer'}>
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
                id="xpack.ml.fieldDataCardExpandedRow.numberContent.displayingPercentilesLabel"
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
