/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, ReactNode, useMemo } from 'react';
import { EuiBasicTable, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { Axis, BarSeries, Chart, Settings } from '@elastic/charts';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import type { FieldDataRowProps } from '../../types/field_data_row';
import { ExpandedRowFieldHeader } from '../expanded_row_field_header';
import { getTFPercentage } from '../../utils';
import { roundToDecimalPlace } from '../../../../formatters/round_to_decimal_place';
import { useDataVizChartTheme } from '../../hooks';
import { DocumentStatsTable } from './document_stats';
import { ExpandedRowContent } from './expanded_row_content';

function getPercentLabel(value: number): string {
  if (value === 0) {
    return '0%';
  }
  if (value >= 0.1) {
    return `${roundToDecimalPlace(value)}%`;
  } else {
    return '< 0.1%';
  }
}

function getFormattedValue(value: number, totalCount: number): string {
  const percentage = (value / totalCount) * 100;
  return `${value} (${getPercentLabel(percentage)})`;
}

const BOOLEAN_DISTRIBUTION_CHART_HEIGHT = 100;

export const BooleanContent: FC<FieldDataRowProps> = ({ config }) => {
  const fieldFormat = 'fieldFormat' in config ? config.fieldFormat : undefined;
  const formattedPercentages = useMemo(() => getTFPercentage(config), [config]);
  const theme = useDataVizChartTheme();
  if (!formattedPercentages) return null;

  const { trueCount, falseCount, count } = formattedPercentages;
  const summaryTableItems = [
    {
      function: 'true',
      display: (
        <FormattedMessage
          id="xpack.ml.fieldDataCardExpandedRow.booleanContent.trueCountLabel"
          defaultMessage="true"
        />
      ),
      value: getFormattedValue(trueCount, count),
    },
    {
      function: 'false',
      display: (
        <FormattedMessage
          id="xpack.ml.fieldDataCardExpandedRow.booleanContent.falseCountLabel"
          defaultMessage="false"
        />
      ),
      value: getFormattedValue(falseCount, count),
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
    'xpack.ml.fieldDataCardExpandedRow.booleanContent.summaryTableTitle',
    {
      defaultMessage: 'Summary',
    }
  );

  return (
    <ExpandedRowContent dataTestSubj={'mlDVBooleanContent'}>
      <DocumentStatsTable config={config} />

      <EuiFlexItem className={'mlDataVisualizerSummaryTableWrapper'}>
        <ExpandedRowFieldHeader>{summaryTableTitle}</ExpandedRowFieldHeader>
        <EuiBasicTable
          className={'mlDataVisualizerSummaryTable'}
          compressed
          items={summaryTableItems}
          columns={summaryTableColumns}
          tableCaption={summaryTableTitle}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <ExpandedRowFieldHeader>
          <FormattedMessage
            id="xpack.ml.fieldDataCard.cardBoolean.valuesLabel"
            defaultMessage="Values"
          />
        </ExpandedRowFieldHeader>
        <EuiSpacer size="xs" />
        <Chart renderer="canvas" size={{ height: BOOLEAN_DISTRIBUTION_CHART_HEIGHT }}>
          <Axis id="bottom" position="bottom" showOverlappingTicks />
          <Axis
            id="left2"
            title="Left axis"
            hide={true}
            tickFormat={(d: any) => getFormattedValue(d, count)}
          />

          <Settings showLegend={false} theme={theme} />
          <BarSeries
            id={config.fieldName || fieldFormat}
            data={[
              {
                x: 'true',
                count: formattedPercentages.trueCount,
              },
              {
                x: 'false',
                count: formattedPercentages.falseCount,
              },
            ]}
            splitSeriesAccessors={['x']}
            stackAccessors={['x']}
            xAccessor="x"
            xScaleType="ordinal"
            yAccessors={['count']}
            yScaleType="linear"
          />
        </Chart>
      </EuiFlexItem>
    </ExpandedRowContent>
  );
};
