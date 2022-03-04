/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, ReactNode, useMemo } from 'react';
import {
  EuiBasicTable,
  EuiSpacer,
  RIGHT_ALIGNMENT,
  LEFT_ALIGNMENT,
  HorizontalAlignment,
} from '@elastic/eui';
import { Axis, BarSeries, Chart, Settings, ScaleType } from '@elastic/charts';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { FieldDataRowProps } from '../../types/field_data_row';
import { ExpandedRowFieldHeader } from '../expanded_row_field_header';
import { getTFPercentage } from '../../utils';
import { roundToDecimalPlace } from '../../../utils';
import { useDataVizChartTheme } from '../../hooks';
import { DocumentStatsTable } from './document_stats';
import { ExpandedRowContent } from './expanded_row_content';
import { ExpandedRowPanel } from './expanded_row_panel';

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

const BOOLEAN_DISTRIBUTION_CHART_HEIGHT = 70;

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
          id="xpack.dataVisualizer.dataGrid.fieldExpandedRow.booleanContent.trueCountLabel"
          defaultMessage="true"
        />
      ),
      value: getFormattedValue(trueCount, count),
    },
    {
      function: 'false',
      display: (
        <FormattedMessage
          id="xpack.dataVisualizer.dataGrid.fieldExpandedRow.booleanContent.falseCountLabel"
          defaultMessage="false"
        />
      ),
      value: getFormattedValue(falseCount, count),
    },
  ];
  const summaryTableColumns = [
    {
      field: 'function',
      name: '',
      render: (_: string, summaryItem: { display: ReactNode }) => summaryItem.display,
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
    'xpack.dataVisualizer.dataGrid.fieldExpandedRow.booleanContent.summaryTableTitle',
    {
      defaultMessage: 'Summary',
    }
  );

  return (
    <ExpandedRowContent dataTestSubj={'dataVisualizerBooleanContent'}>
      <DocumentStatsTable config={config} />

      <ExpandedRowPanel className={'dvSummaryTable__wrapper dvPanel__wrapper'}>
        <ExpandedRowFieldHeader>{summaryTableTitle}</ExpandedRowFieldHeader>
        <EuiBasicTable
          className={'dvSummaryTable'}
          compressed
          items={summaryTableItems}
          columns={summaryTableColumns}
          tableCaption={summaryTableTitle}
        />
      </ExpandedRowPanel>

      <ExpandedRowPanel className={'dvPanel__wrapper dvPanel--uniform'}>
        <ExpandedRowFieldHeader>
          <FormattedMessage
            id="xpack.dataVisualizer.dataGrid.field.cardBoolean.valuesLabel"
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
            xScaleType={ScaleType.Ordinal}
            yAccessors={['count']}
            yScaleType={ScaleType.Linear}
          />
        </Chart>
      </ExpandedRowPanel>
    </ExpandedRowContent>
  );
};
