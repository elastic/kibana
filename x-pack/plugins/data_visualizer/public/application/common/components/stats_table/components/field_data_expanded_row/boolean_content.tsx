/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { Axis, BarSeries, Chart, Settings, ScaleType, LEGACY_LIGHT_THEME } from '@elastic/charts';

import { FormattedMessage } from '@kbn/i18n-react';
import { roundToDecimalPlace } from '@kbn/ml-number-utils';
import { i18n } from '@kbn/i18n';
import { TopValues } from '../../../top_values';
import type { FieldDataRowProps } from '../../types/field_data_row';
import { ExpandedRowFieldHeader } from '../expanded_row_field_header';
import { getTFPercentage } from '../../utils';
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

export const BooleanContent: FC<FieldDataRowProps> = ({ config, onAddFilter }) => {
  const fieldFormat = 'fieldFormat' in config ? config.fieldFormat : undefined;
  const formattedPercentages = useMemo(() => getTFPercentage(config), [config]);
  const theme = useDataVizChartTheme();
  if (!formattedPercentages) return null;

  const { count } = formattedPercentages;
  return (
    <ExpandedRowContent dataTestSubj={'dataVisualizerBooleanContent'}>
      <DocumentStatsTable config={config} />

      <TopValues
        stats={config.stats}
        fieldFormat={fieldFormat}
        barColor="success"
        onAddFilter={onAddFilter}
      />

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

          <Settings
            // TODO connect to charts.theme service see src/plugins/charts/public/services/theme/README.md
            baseTheme={LEGACY_LIGHT_THEME}
            showLegend={false}
            theme={theme}
            locale={i18n.getLocale()}
          />
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
