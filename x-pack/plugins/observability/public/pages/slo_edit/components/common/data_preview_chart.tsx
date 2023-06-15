/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AreaSeries, Axis, Chart, Position, ScaleType, Settings } from '@elastic/charts';
import { EuiFlexItem, EuiIcon, EuiLoadingChart, EuiPanel } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { CreateSLOInput } from '@kbn/slo-schema';
import moment from 'moment';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { useKibana } from '../../../../utils/kibana_react';
import { useDebouncedGetPreviewData } from '../../hooks/use_preview';
export function DataPreviewChart() {
  const { watch, getFieldState } = useFormContext<CreateSLOInput>();
  const { charts, uiSettings } = useKibana().services;

  const { data: previewData, isLoading: isPreviewLoading } = useDebouncedGetPreviewData(
    watch('indicator')
  );

  const theme = charts.theme.useChartsTheme();
  const baseTheme = charts.theme.useChartsBaseTheme();
  const dateFormat = uiSettings.get('dateFormat');
  const percentFormat = uiSettings.get('format:percent:defaultPattern');

  if (getFieldState('indicator').invalid) {
    return null;
  }

  return (
    <EuiFlexItem>
      {isPreviewLoading && <EuiLoadingChart size="m" mono />}
      {!isPreviewLoading && !!previewData && (
        <EuiPanel hasBorder={true} hasShadow={false}>
          <Chart size={{ height: 160, width: '100%' }}>
            <Settings
              baseTheme={baseTheme}
              showLegend={false}
              theme={[
                {
                  ...theme,
                  lineSeriesStyle: {
                    point: { visible: false },
                  },
                },
              ]}
              tooltip="vertical"
              noResults={
                <EuiIcon type="visualizeApp" size="l" color="subdued" title="no results" />
              }
            />

            <Axis
              id="y-axis"
              title={i18n.translate('xpack.observability.slo.sloEdit.dataPreviewChart.yTitle', {
                defaultMessage: 'SLI',
              })}
              ticks={5}
              position={Position.Left}
              tickFormat={(d) => numeral(d).format(percentFormat)}
            />

            <Axis
              id="time"
              title={i18n.translate('xpack.observability.slo.sloEdit.dataPreviewChart.xTitle', {
                defaultMessage: 'Last hour',
              })}
              tickFormat={(d) => moment(d).format(dateFormat)}
              position={Position.Bottom}
              timeAxisLayerCount={2}
              gridLine={{ visible: true }}
              style={{
                tickLine: { size: 0.0001, padding: 4, visible: true },
                tickLabel: {
                  alignment: {
                    horizontal: Position.Left,
                    vertical: Position.Bottom,
                  },
                  padding: 0,
                  offset: { x: 0, y: 0 },
                },
              }}
            />
            <AreaSeries
              id="SLI"
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor="date"
              yAccessors={['value']}
              data={previewData.map((datum) => ({
                date: new Date(datum.date).getTime(),
                value: datum.sliValue >= 0 ? datum.sliValue : null,
              }))}
            />
          </Chart>
        </EuiPanel>
      )}
    </EuiFlexItem>
  );
}
