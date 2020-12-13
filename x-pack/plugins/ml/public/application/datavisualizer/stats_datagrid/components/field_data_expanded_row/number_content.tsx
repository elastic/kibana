/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, ReactNode, useEffect, useState } from 'react';
import { EuiBasicTable, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { FieldDataCardProps } from '../../../index_based/components/field_data_card';
import { kibanaFieldFormat } from '../../../../formatters/kibana_field_format';
import { numberAsOrdinal } from '../../../../formatters/number_as_ordinal';
import {
  MetricDistributionChart,
  MetricDistributionChartData,
  buildChartDataFromStats,
} from '../../../index_based/components/field_data_card/metric_distribution_chart';
import { TopValues } from '../../../index_based/components/field_data_card/top_values';
import { ExpandedRowFieldHeader } from '../expanded_row_field_header';

const METRIC_DISTRIBUTION_CHART_WIDTH = 325;
const METRIC_DISTRIBUTION_CHART_HEIGHT = 210;

interface SummaryTableItem {
  function: string;
  display: ReactNode;
  value: number | string | undefined | null;
}

export const NumberContent: FC<FieldDataCardProps> = ({ config }) => {
  const { stats, fieldFormat } = config;

  useEffect(() => {
    const chartData = buildChartDataFromStats(stats, METRIC_DISTRIBUTION_CHART_WIDTH);
    setDistributionChartData(chartData);
  }, []);

  const defaultChartData: MetricDistributionChartData[] = [];
  const [distributionChartData, setDistributionChartData] = useState(defaultChartData);

  if (stats === undefined) return null;
  const { min, median, max, distribution } = stats;

  const summaryTableItems = [
    {
      function: 'min',
      display: (
        <FormattedMessage id="xpack.ml.fieldDataCard.cardNumber.minLabel" defaultMessage="min" />
      ),
      value: kibanaFieldFormat(min, fieldFormat),
    },
    {
      function: 'median',
      display: (
        <FormattedMessage
          id="xpack.ml.fieldDataCard.cardNumber.medianLabel"
          defaultMessage="median"
        />
      ),
      value: kibanaFieldFormat(median, fieldFormat),
    },
    {
      function: 'max',
      display: (
        <FormattedMessage id="xpack.ml.fieldDataCard.cardNumber.maxLabel" defaultMessage="max" />
      ),
      value: kibanaFieldFormat(max, fieldFormat),
    },
  ];
  const summaryTableColumns = [
    {
      name: '',
      render: (summaryItem: { display: ReactNode }) => summaryItem.display,
    },
    {
      field: 'value',
      name: '',
      render: (v: string) => <strong>{v}</strong>,
    },
  ];

  const summaryTableTitle = i18n.translate('xpack.ml.fieldDataCard.cardNumber.summaryTableTitle', {
    defaultMessage: 'summary',
  });
  return (
    <EuiFlexGroup direction={'row'}>
      <EuiFlexItem>
        <ExpandedRowFieldHeader>{summaryTableTitle}</ExpandedRowFieldHeader>
        <EuiBasicTable<SummaryTableItem>
          compressed
          items={summaryTableItems}
          columns={summaryTableColumns}
          tableCaption={summaryTableTitle}
          tableLayout="auto"
        />
      </EuiFlexItem>
      {stats && (
        <EuiFlexItem>
          <EuiFlexGroup direction={'column'} alignItems={'center'}>
            <EuiFlexItem>
              <ExpandedRowFieldHeader>
                <FormattedMessage
                  id={'xpack.ml.fieldDataCard.cardNumber.topValuesTitle'}
                  defaultMessage={'top values'}
                />
              </ExpandedRowFieldHeader>
            </EuiFlexItem>
            <EuiFlexItem>
              <TopValues stats={stats} fieldFormat={fieldFormat} barColor="primary" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
      {distribution && (
        <EuiFlexItem>
          <EuiFlexGroup direction={'column'} alignItems={'center'}>
            <EuiFlexItem>
              <ExpandedRowFieldHeader>
                <FormattedMessage
                  id={'xpack.ml.fieldDataCard.cardNumber.distributionTitle'}
                  defaultMessage={'distribution'}
                />
              </ExpandedRowFieldHeader>
            </EuiFlexItem>

            <Fragment>
              <EuiFlexGroup justifyContent="spaceAround" gutterSize="xs">
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    <FormattedMessage
                      id="xpack.ml.fieldDataCard.cardNumber.displayingPercentilesLabel"
                      defaultMessage="Displaying {minPercent} - {maxPercent} percentiles"
                      values={{
                        minPercent: numberAsOrdinal(distribution.minPercentile),
                        maxPercent: numberAsOrdinal(distribution.maxPercentile),
                      }}
                    />
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiFlexItem style={{ width: '100%' }}>
                <MetricDistributionChart
                  width={METRIC_DISTRIBUTION_CHART_WIDTH}
                  height={METRIC_DISTRIBUTION_CHART_HEIGHT}
                  chartData={distributionChartData}
                  fieldFormat={fieldFormat}
                />
              </EuiFlexItem>
            </Fragment>
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
