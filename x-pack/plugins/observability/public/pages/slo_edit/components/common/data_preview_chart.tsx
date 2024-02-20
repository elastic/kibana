/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AreaSeries, Axis, Chart, Position, ScaleType, Settings } from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiLoadingChart,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { ALL_VALUE, GetPreviewDataByGroupResponse, GetPreviewDataResponse } from '@kbn/slo-schema';
import { Resizable } from 're-resizable';
import { EuiSelectOption } from '@elastic/eui/src/components/form/select/select';
import { ChartConfig } from './sli_events_chart/chart_config';
import { InvalidIndicator } from './sli_events_chart/invalid_indicator';
import { useChartDomain } from './sli_events_chart/use_chart_domain';
import { ThresholdAnnotation } from './sli_events_chart/threshold_annotation';
import { useIsMoreThan100 } from './sli_events_chart/use_is_more_than_100';
import { SLITooltip } from './sli_events_chart/sli_tooltip';
import { useKibana } from '../../../../utils/kibana_react';
import { useDebouncedGetPreviewData } from '../../hooks/use_preview';
import { useSectionFormValidation } from '../../hooks/use_section_form_validation';
import { CreateSLOForm } from '../../types';

interface DataPreviewChartProps {
  formatPattern?: string;
  threshold?: number;
  thresholdDirection?: 'above' | 'below';
  thresholdColor?: string;
  thresholdMessage?: string;
  ignoreMoreThan100?: boolean;
}

const IN_MILLISECONDS: Record<string, number> = {
  '1h': 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

export function DataPreviewChart({
  formatPattern,
  threshold,
  thresholdDirection,
  thresholdColor,
  thresholdMessage,
  ignoreMoreThan100,
}: DataPreviewChartProps) {
  const { watch, getFieldState, formState, getValues } = useFormContext<CreateSLOForm>();
  const { charts, uiSettings } = useKibana().services;
  const { isIndicatorSectionValid } = useSectionFormValidation({
    getFieldState,
    getValues,
    formState,
    watch,
  });

  const [selectedPeriod, setSelectedPeriod] = useState('1h');
  const [groupBySampleSize, setGroupBySampleSize] = useState(10);

  const groupByField = watch('groupBy');

  const [range, setRange] = useState({
    start: new Date().getTime() - IN_MILLISECONDS[selectedPeriod],
    end: new Date().getTime(),
  });

  useEffect(() => {
    setRange({
      start: new Date().getTime() - IN_MILLISECONDS[selectedPeriod],
      end: new Date().getTime(),
    });
  }, [selectedPeriod]);

  const [size, setSize] = useState({
    width: 800,
    height: 240,
  });

  const {
    data: previewData,
    isLoading: isPreviewLoading,
    isError,
  } = useDebouncedGetPreviewData(
    isIndicatorSectionValid,
    watch('indicator'),
    range,
    groupByField,
    groupBySampleSize
  );

  useEffect(() => {
    if (groupByField && groupByField !== ALL_VALUE) {
      setSize((prevState) =>
        prevState.height === 240 ? { ...prevState, height: 320 } : prevState
      );
    }
  }, [groupByField]);

  const isMoreThan100 = useIsMoreThan100({ ignoreMoreThan100, previewData });

  const baseTheme = charts.theme.useChartsBaseTheme();
  const dateFormat = uiSettings.get('dateFormat');
  const numberFormat =
    formatPattern != null
      ? formatPattern
      : (uiSettings.get('format:percent:defaultPattern') as string);

  const { maxValue, minValue, domain } = useChartDomain({ previewData, threshold });

  const title = (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.observability.slo.sloEdit.dataPreviewChart.panelLabel"
                defaultMessage="SLI preview"
              />
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ChartConfig
            groupSampleSize={groupBySampleSize}
            setGroupSampleSize={setGroupBySampleSize}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
    </>
  );

  if (!isIndicatorSectionValid) {
    return <InvalidIndicator title={title} minHeight={size.height} />;
  }

  return (
    <EuiFlexItem>
      {title}
      {isMoreThan100}
      <Resizable
        size={{ width: size.width - 32, height: size.height }}
        onResizeStop={(e, direction, ref, d) => {
          setSize({
            width: size.width + d.width,
            height: size.height + d.height,
          });
        }}
      >
        <EuiFormRow fullWidth>
          <EuiPanel hasBorder={true} hasShadow={false} style={{ minHeight: size.height }}>
            {isPreviewLoading || isError ? (
              <EuiFlexGroup
                justifyContent="center"
                alignItems="center"
                style={{ height: size.height - 64 }}
              >
                <EuiFlexItem grow={false}>
                  {isPreviewLoading && <EuiLoadingChart size="m" mono />}
                  {isError && <span>{INVALID_INDICATOR}</span>}
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <Chart size={{ height: size.height - 64, width: '100%' }}>
                <SLITooltip />
                <Settings
                  baseTheme={baseTheme}
                  showLegend={groupByField !== '*'}
                  theme={[
                    {
                      lineSeriesStyle: {
                        point: { visible: false },
                      },
                    },
                  ]}
                  noResults={
                    <EuiIcon type="visualizeApp" size="l" color="subdued" title="no results" />
                  }
                  locale={i18n.getLocale()}
                />

                <ThresholdAnnotation
                  threshold={threshold}
                  thresholdColor={thresholdColor}
                  thresholdDirection={thresholdDirection}
                  thresholdMessage={thresholdMessage}
                  maxValue={maxValue}
                  minValue={minValue}
                />

                <Axis
                  id="y-axis"
                  title={i18n.translate('xpack.observability.slo.sloEdit.dataPreviewChart.yTitle', {
                    defaultMessage: 'SLI',
                  })}
                  ticks={5}
                  position={Position.Left}
                  tickFormat={(d) => numeral(d).format(numberFormat)}
                  domain={domain}
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
                    tickLine: { size: 0, padding: 4, visible: true },
                    tickLabel: {
                      alignment: {
                        horizontal: Position.Left,
                        vertical: Position.Bottom,
                      },
                      padding: 0,
                      offset: { x: 0, y: 0 },
                    },
                  }}
                  hide={true}
                />
                {groupByField === '*' ? (
                  <AreaSeries
                    id="SLI"
                    xScaleType={ScaleType.Time}
                    yScaleType={ScaleType.Linear}
                    xAccessor="date"
                    yAccessors={['value']}
                    data={((previewData as GetPreviewDataResponse) ?? []).map((datum) => ({
                      date: new Date(datum.date).getTime(),
                      value: datum.sliValue && datum.sliValue >= 0 ? datum.sliValue : null,
                      events: datum.events,
                    }))}
                  />
                ) : (
                  (previewData as GetPreviewDataByGroupResponse).map(({ group, data }) => (
                    <AreaSeries
                      id={group + ' - SLI'}
                      key={group}
                      xScaleType={ScaleType.Time}
                      yScaleType={ScaleType.Linear}
                      xAccessor="date"
                      yAccessors={['value']}
                      data={(data ?? []).map((datum) => ({
                        date: new Date(datum.date).getTime(),
                        value: datum.sliValue && datum.sliValue >= 0 ? datum.sliValue : null,
                        events: datum.events,
                      }))}
                    />
                  ))
                )}
              </Chart>
            )}
            <EuiSpacer size="xs" />
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiSelect
                  compressed
                  data-test-subj="o11yDataPreviewChartSelect"
                  id="dataPreviewChartSelect"
                  options={periodOptions}
                  value={selectedPeriod}
                  onChange={(e) => {
                    setSelectedPeriod(e.target.value);
                  }}
                  aria-label={SELECT_PERIOD}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFormRow>
      </Resizable>
    </EuiFlexItem>
  );
}

const SELECT_PERIOD = i18n.translate(
  'xpack.observability.slo.sloEdit.dataPreviewChart.selectPeriodAriaLabel',
  {
    defaultMessage: 'Select period',
  }
);

const periodOptions: EuiSelectOption[] = [
  {
    value: '1h',
    text: i18n.translate('xpack.observability.slo.sloEdit.dataPreviewChart.lastHour', {
      defaultMessage: 'Last hour',
    }),
  },
  {
    value: '12h',
    text: i18n.translate('xpack.observability.slo.sloEdit.dataPreviewChart.last24Hours', {
      defaultMessage: 'Last 12 hours',
    }),
  },
  {
    value: '1d',
    text: i18n.translate('xpack.observability.slo.sloEdit.dataPreviewChart.last24Hours', {
      defaultMessage: 'Last 24 hours',
    }),
  },
  {
    value: '7d',
    text: i18n.translate('xpack.observability.slo.sloEdit.dataPreviewChart.last7Days', {
      defaultMessage: 'Last 7 days',
    }),
  },
  {
    value: '30d',
    text: i18n.translate('xpack.observability.slo.sloEdit.dataPreviewChart.last30Days', {
      defaultMessage: 'Last 30 days',
    }),
  },
];

const INVALID_INDICATOR = i18n.translate(
  'xpack.observability.slo.sloEdit.dataPreviewChart.errorMessage',
  {
    defaultMessage: 'The current indicator settings are invalid',
  }
);
