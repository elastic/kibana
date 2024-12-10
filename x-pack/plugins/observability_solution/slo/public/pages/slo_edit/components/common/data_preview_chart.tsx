/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AnnotationDomainType,
  AreaSeries,
  Axis,
  Chart,
  LineAnnotation,
  Position,
  RectAnnotation,
  ScaleType,
  Settings,
  Tooltip,
  TooltipTable,
  TooltipTableColumn,
} from '@elastic/charts';
import {
  EuiCallOut,
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
import { FormattedMessage } from '@kbn/i18n-react';
import { max, min } from 'lodash';
import moment from 'moment';
import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useKibana } from '../../../../hooks/use_kibana';
import { GoodBadEventsChart } from '../../../../components/good_bad_events_chart/good_bad_events_chart';
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
  useGoodBadEventsChart?: boolean;
  label?: string;
  range?: {
    from: Date;
    to: Date;
  };
}

export function DataPreviewChart({
  formatPattern,
  threshold,
  thresholdDirection,
  thresholdColor,
  thresholdMessage,
  ignoreMoreThan100,
  label,
  useGoodBadEventsChart,
  range,
}: DataPreviewChartProps) {
  const { watch, getFieldState, formState, getValues } = useFormContext<CreateSLOForm>();
  const { charts, uiSettings } = useKibana().services;
  const { isIndicatorSectionValid } = useSectionFormValidation({
    getFieldState,
    getValues,
    formState,
    watch,
  });

  const [defaultRange, _] = useState({
    from: moment().subtract(1, 'hour').toDate(),
    to: new Date(),
  });

  const indicator = watch('indicator');

  const {
    data: previewData,
    isLoading: isPreviewLoading,
    isSuccess,
    isError,
  } = useDebouncedGetPreviewData(isIndicatorSectionValid, indicator, range ?? defaultRange);

  const isMoreThan100 =
    !ignoreMoreThan100 && previewData?.find((row) => row.sliValue && row.sliValue > 1) != null;

  const baseTheme = charts.theme.useChartsBaseTheme();
  const dateFormat = uiSettings.get('dateFormat');
  const numberFormat =
    formatPattern != null
      ? formatPattern
      : (uiSettings.get('format:percent:defaultPattern') as string);

  // map values to row.sliValue and filter out no data values
  const values = (previewData || []).map((row) => row.sliValue);
  const maxValue = max(values);
  const minValue = min(values);
  const domain = {
    fit: true,
    min:
      threshold != null && minValue != null && threshold < minValue ? threshold : minValue || NaN,
    max:
      threshold != null && maxValue != null && threshold > maxValue ? threshold : maxValue || NaN,
  };

  const title = (
    <>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.slo.sloEdit.dataPreviewChart.panelLabel"
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
                {i18n.translate('xpack.slo.sloEdit.dataPreviewChart.explanationMessage', {
                  defaultMessage:
                    'Fill the indicator fields to see visualisation of the current metrics',
                })}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFormRow>
      </EuiFlexItem>
    );
  }

  const annotation = threshold != null && (
    <>
      <LineAnnotation
        id="thresholdAnnotation"
        domainType={AnnotationDomainType.YDomain}
        dataValues={[{ dataValue: threshold }]}
        style={{
          line: {
            strokeWidth: 2,
            stroke: thresholdColor || '#000',
            opacity: 1,
          },
        }}
      />
      <RectAnnotation
        dataValues={[
          {
            coordinates:
              thresholdDirection === 'above'
                ? {
                    y0: threshold,
                    y1: maxValue,
                  }
                : { y0: minValue, y1: threshold },
            details: thresholdMessage,
          },
        ]}
        id="thresholdShade"
        style={{ fill: thresholdColor || '#000', opacity: 0.1 }}
      />
    </>
  );

  const columns: TooltipTableColumn[] = [
    {
      id: 'color',
      type: 'color',
    },
    {
      id: 'label',
      type: 'custom',
      truncate: true,
      cell: ({ label: cellLabel }) => <span className="echTooltip__label">{cellLabel}</span>,
      style: {
        textAlign: 'left',
      },
    },
    {
      id: 'value',
      type: 'custom',
      cell: ({ formattedValue }) => (
        <>
          <span className="echTooltip__value" dir="ltr">
            {formattedValue}
          </span>
        </>
      ),
      style: {
        textAlign: 'right',
      },
    },
  ];

  return (
    <EuiFlexItem>
      {title}
      {isMoreThan100 && (
        <>
          <EuiSpacer size="xs" />
          <EuiCallOut
            size="s"
            color="warning"
            title={i18n.translate('xpack.slo.sloEdit.dataPreviewChart.moreThan100', {
              defaultMessage:
                'Some of the SLI values are more than 100%. That means good query is returning more results than total query.',
            })}
            iconType="warning"
          />
          <EuiSpacer size="xs" />
        </>
      )}
      <EuiFormRow fullWidth>
        <EuiPanel hasBorder={true} hasShadow={false} style={{ minHeight: 194 }}>
          {(isPreviewLoading || isError) && (
            <EuiFlexGroup justifyContent="center" alignItems="center" style={{ height: 160 }}>
              <EuiFlexItem grow={false}>
                {isPreviewLoading && <EuiLoadingChart size="m" mono />}
                {isError && (
                  <span>
                    {i18n.translate('xpack.slo.sloEdit.dataPreviewChart.errorMessage', {
                      defaultMessage: 'The current indicator settings are invalid',
                    })}
                  </span>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          {isSuccess && useGoodBadEventsChart && (
            <GoodBadEventsChart
              data={previewData || []}
              bottomTitle={label || DEFAULT_LABEL}
              isLoading={isPreviewLoading}
              annotation={annotation}
            />
          )}
          {isSuccess && !useGoodBadEventsChart && (
            <Chart size={{ height: 160, width: '100%' }}>
              <Tooltip
                type="vertical"
                body={({ items }) => {
                  const firstItem = items[0];
                  const events = firstItem.datum.events;
                  const rows = [items[0]];
                  if (events) {
                    rows.push({
                      ...firstItem,
                      formattedValue: events.good,
                      value: events.good,
                      label: i18n.translate('xpack.slo.sloEdit.dataPreviewChart.goodEvents', {
                        defaultMessage: 'Good events',
                      }),
                    });
                    rows.push({
                      ...firstItem,
                      value: events.total,
                      formattedValue: events.total,
                      label: i18n.translate('xpack.slo.sloEdit.dataPreviewChart.badEvents', {
                        defaultMessage: 'Total events',
                      }),
                    });
                  }

                  return <TooltipTable columns={columns} items={rows} />;
                }}
              />
              <Settings
                baseTheme={baseTheme}
                showLegend={false}
                theme={[
                  {
                    lineSeriesStyle: {
                      point: { visible: 'never' },
                    },
                  },
                ]}
                noResults={
                  <EuiIcon
                    type="visualizeApp"
                    size="l"
                    color="subdued"
                    title={i18n.translate('xpack.slo.dataPreviewChart.noResultsLabel', {
                      defaultMessage: 'no results',
                    })}
                  />
                }
                locale={i18n.getLocale()}
              />

              {annotation}

              <Axis
                id="y-axis"
                title={i18n.translate('xpack.slo.sloEdit.dataPreviewChart.yTitle', {
                  defaultMessage: 'SLI',
                })}
                ticks={5}
                position={Position.Left}
                tickFormat={(d) => numeral(d).format(numberFormat)}
                domain={domain}
              />

              <Axis
                id="time"
                title={label || DEFAULT_LABEL}
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
              />
              <AreaSeries
                id="SLI"
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor="date"
                yAccessors={['value']}
                data={(previewData ?? []).map((datum) => ({
                  date: new Date(datum.date).getTime(),
                  value: datum.sliValue && datum.sliValue >= 0 ? datum.sliValue : null,
                  events: datum.events,
                }))}
              />
            </Chart>
          )}
        </EuiPanel>
      </EuiFormRow>
    </EuiFlexItem>
  );
}

const DEFAULT_LABEL = i18n.translate('xpack.slo.sloEdit.dataPreviewChart.xTitle', {
  defaultMessage: 'Last hour',
});
