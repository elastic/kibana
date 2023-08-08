/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AreaSeries, Axis, Chart, Position, ScaleType, Settings, Tooltip } from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiLoadingChart,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../../utils/kibana_react';
import { useDebouncedGetPreviewData } from '../../hooks/use_preview';
import { useSectionFormValidation } from '../../hooks/use_section_form_validation';
import { CreateSLOForm } from '../../types';

export function DataPreviewChart() {
  const { watch, getFieldState, formState, getValues } = useFormContext<CreateSLOForm>();
  const { charts, uiSettings } = useKibana().services;
  const { isIndicatorSectionValid } = useSectionFormValidation({
    getFieldState,
    getValues,
    formState,
    watch,
  });

  const {
    data: previewData,
    isLoading: isPreviewLoading,
    isSuccess,
    isError,
  } = useDebouncedGetPreviewData(isIndicatorSectionValid, watch('indicator'));

  const theme = charts.theme.useChartsTheme();
  const baseTheme = charts.theme.useChartsBaseTheme();
  const dateFormat = uiSettings.get('dateFormat');
  const percentFormat = uiSettings.get('format:percent:defaultPattern');
  const title = (
    <>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.observability.slo.sloEdit.dataPreviewChart.panelLabel"
            defaultMessage="SLI preview"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
    </>
  );

  if (!isIndicatorSectionValid) {
    return (
      <EuiFlexItem>
        {title}
        <EuiFormRow fullWidth>
          <EuiPanel hasBorder={true} hasShadow={false} style={{ minHeight: 194 }}>
            <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 160 }}>
              <EuiFlexItem grow={false}>
                {i18n.translate(
                  'xpack.observability.slo.sloEdit.dataPreviewChart.explanationMessage',
                  {
                    defaultMessage:
                      'Fill the indicator fields to see visualisation of the current metrics',
                  }
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFormRow>
      </EuiFlexItem>
    );
  }

  return (
    <EuiFlexItem>
      {title}
      <EuiFormRow fullWidth>
        <EuiPanel hasBorder={true} hasShadow={false} style={{ minHeight: 194 }}>
          {(isPreviewLoading || isError) && (
            <EuiFlexGroup justifyContent="center" alignItems="center" style={{ height: 160 }}>
              <EuiFlexItem grow={false}>
                {isPreviewLoading && <EuiLoadingChart size="m" mono />}
                {isError && (
                  <span>
                    {i18n.translate(
                      'xpack.observability.slo.sloEdit.dataPreviewChart.errorMessage',
                      {
                        defaultMessage: 'The current indicator settings are invalid',
                      }
                    )}
                  </span>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          {isSuccess && (
            <Chart size={{ height: 160, width: '100%' }}>
              <Tooltip type="vertical" />
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
                data={(previewData ?? []).map((datum) => ({
                  date: new Date(datum.date).getTime(),
                  value: datum.sliValue >= 0 ? datum.sliValue : null,
                }))}
              />
            </Chart>
          )}
        </EuiPanel>
      </EuiFormRow>
    </EuiFlexItem>
  );
}
