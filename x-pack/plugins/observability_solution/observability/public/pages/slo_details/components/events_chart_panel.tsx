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
  BarSeries,
  Chart,
  ElementClickListener,
  LineAnnotation,
  Position,
  RectAnnotation,
  ScaleType,
  Settings,
  Tooltip,
  TooltipType,
  XYChartElementEvent,
} from '@elastic/charts';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingChart,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { useActiveCursor } from '@kbn/charts-plugin/public';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { isObject, max, min } from 'lodash';
import moment from 'moment';
import React, { useRef } from 'react';
import { FilterStateStore } from '@kbn/es-query';
import { DiscoverStart } from '@kbn/discover-plugin/public';
import { useGetPreviewData } from '../../../hooks/slo/use_get_preview_data';
import { buildEsQuery } from '../../../utils/build_es_query';
import { useKibana } from '../../../utils/kibana_react';
import { COMPARATOR_MAPPING } from '../../slo_edit/constants';

export interface Props {
  slo: SLOWithSummaryResponse;
  range: {
    start: number;
    end: number;
  };
}

export function EventsChartPanel({ slo, range }: Props) {
  const { charts, uiSettings, discover } = useKibana().services;
  const { euiTheme } = useEuiTheme();
  const baseTheme = charts.theme.useChartsBaseTheme();
  const chartRef = useRef(null);
  const handleCursorUpdate = useActiveCursor(charts.activeCursor, chartRef, {
    isDateHistogram: true,
  });

  const { isLoading, data } = useGetPreviewData({
    range,
    isValid: true,
    indicator: slo.indicator,
    groupings: slo.groupings,
    instanceId: slo.instanceId,
  });

  const dateFormat = uiSettings.get('dateFormat');

  const title =
    slo.indicator.type !== 'sli.metric.timeslice' ? (
      <EuiTitle size="xs">
        <h2>
          {i18n.translate('xpack.observability.slo.sloDetails.eventsChartPanel.title', {
            defaultMessage: 'Good vs bad events',
          })}
        </h2>
      </EuiTitle>
    ) : (
      <EuiTitle size="xs">
        <h2>
          {i18n.translate('xpack.observability.slo.sloDetails.eventsChartPanel.timesliceTitle', {
            defaultMessage: 'Timeslice metric',
          })}
        </h2>
      </EuiTitle>
    );
  const threshold =
    slo.indicator.type === 'sli.metric.timeslice'
      ? slo.indicator.params.metric.threshold
      : undefined;
  const yAxisNumberFormat = slo.indicator.type === 'sli.metric.timeslice' ? '0,0[.00]' : '0,0';

  const values = (data || []).map((row) => {
    if (slo.indicator.type === 'sli.metric.timeslice') {
      return row.sliValue;
    } else {
      return row?.events?.total || 0;
    }
  });
  const maxValue = max(values);
  const minValue = min(values);
  const domain = {
    fit: true,
    min:
      threshold != null && minValue != null && threshold < minValue ? threshold : minValue || NaN,
    max:
      threshold != null && maxValue != null && threshold > maxValue ? threshold : maxValue || NaN,
  };

  const intervalInMilliseconds =
    data && data.length > 2
      ? moment(data[1].date).valueOf() - moment(data[0].date).valueOf()
      : 10 * 60000;

  const annotation =
    slo.indicator.type === 'sli.metric.timeslice' && threshold ? (
      <>
        <LineAnnotation
          id="thresholdAnnotation"
          domainType={AnnotationDomainType.YDomain}
          dataValues={[{ dataValue: threshold }]}
          style={{
            line: {
              strokeWidth: 2,
              stroke: euiTheme.colors.warning || '#000',
              opacity: 1,
            },
          }}
          marker={<span>{threshold}</span>}
          markerPosition="right"
        />
        <RectAnnotation
          dataValues={[
            {
              coordinates: ['GT', 'GTE'].includes(slo.indicator.params.metric.comparator)
                ? {
                    y0: threshold,
                    y1: maxValue,
                  }
                : { y0: minValue, y1: threshold },
              details: `${COMPARATOR_MAPPING[slo.indicator.params.metric.comparator]} ${threshold}`,
            },
          ]}
          id="thresholdShade"
          style={{ fill: euiTheme.colors.warning || '#000', opacity: 0.1 }}
        />
      </>
    ) : null;

  const goodEventId = i18n.translate(
    'xpack.observability.slo.sloDetails.eventsChartPanel.goodEventsLabel',
    { defaultMessage: 'Good events' }
  );

  const badEventId = i18n.translate(
    'xpack.observability.slo.sloDetails.eventsChartPanel.badEventsLabel',
    { defaultMessage: 'Bad events' }
  );

  const viewEventsClickHandler = () => {
    const timeRange = {
      from: 'now-24h',
      to: 'now',
      mode: 'relative' as const,
    };
    openInDiscover(discover, slo, false, false, timeRange);
  };

  const barClickHandler = (params: XYChartElementEvent[]) => {
    if (slo.indicator.type === 'sli.kql.custom') {
      const [datanum, eventDetail] = params[0];
      const isBad = eventDetail.specId === badEventId;
      const timeRange = {
        from: moment(datanum.x).toISOString(),
        to: moment(datanum.x).add(intervalInMilliseconds, 'ms').toISOString(),
        mode: 'absolute' as const,
      };
      openInDiscover(discover, slo, isBad, !isBad, timeRange);
    }
  };

  return (
    <EuiPanel paddingSize="m" color="transparent" hasBorder data-test-subj="eventsChartPanel">
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexGroup>
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem grow={1}> {title}</EuiFlexItem>
            <EuiFlexItem>
              <EuiText color="subdued" size="s">
                {i18n.translate('xpack.observability.slo.sloDetails.eventsChartPanel.duration', {
                  defaultMessage: 'Last 24h',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          {slo.indicator.type === 'sli.kql.custom' && (
            <EuiFlexItem grow={0}>
              <EuiButtonEmpty
                data-test-subj="o11yEventsChartPanelViewEventsButton"
                onClick={viewEventsClickHandler}
              >
                {i18n.translate('xpack.observability.slo.sloDetails.viewEventsFlexItemLabel', {
                  defaultMessage: 'View events',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        <EuiFlexItem>
          {isLoading && <EuiLoadingChart size="m" mono data-test-subj="sliEventsChartLoading" />}

          {!isLoading && (
            <Chart size={{ height: 150, width: '100%' }} ref={chartRef}>
              <Tooltip type={TooltipType.VerticalCursor} />
              <Settings
                baseTheme={baseTheme}
                showLegend={slo.indicator.type !== 'sli.metric.timeslice'}
                showLegendExtra={false}
                legendPosition={Position.Left}
                noResults={
                  <EuiIcon type="visualizeApp" size="l" color="subdued" title="no results" />
                }
                onPointerUpdate={handleCursorUpdate}
                externalPointerEvents={{
                  tooltip: { visible: true },
                }}
                pointerUpdateDebounce={0}
                pointerUpdateTrigger={'x'}
                locale={i18n.getLocale()}
                onElementClick={barClickHandler as ElementClickListener}
              />
              {annotation}

              <Axis
                id="bottom"
                position={Position.Bottom}
                showOverlappingTicks
                tickFormat={(d) => moment(d).format(dateFormat)}
              />
              <Axis
                id="left"
                position={Position.Left}
                tickFormat={(d) => numeral(d).format(yAxisNumberFormat)}
                domain={domain}
              />

              {slo.indicator.type !== 'sli.metric.timeslice' ? (
                <>
                  <BarSeries
                    id={goodEventId}
                    color={euiTheme.colors.success}
                    barSeriesStyle={{
                      rect: { fill: euiTheme.colors.success },
                      displayValue: { fill: euiTheme.colors.success },
                    }}
                    xScaleType={ScaleType.Time}
                    yScaleType={ScaleType.Linear}
                    xAccessor="key"
                    yAccessors={['value']}
                    stackAccessors={[0]}
                    data={
                      data?.map((datum) => ({
                        key: new Date(datum.date).getTime(),
                        value: datum.events?.good,
                      })) ?? []
                    }
                  />

                  <BarSeries
                    id={badEventId}
                    color={euiTheme.colors.danger}
                    barSeriesStyle={{
                      rect: { fill: euiTheme.colors.danger },
                      displayValue: { fill: euiTheme.colors.danger },
                    }}
                    xScaleType={ScaleType.Time}
                    yScaleType={ScaleType.Linear}
                    xAccessor="key"
                    yAccessors={['value']}
                    stackAccessors={[0]}
                    data={
                      data?.map((datum) => ({
                        key: new Date(datum.date).getTime(),
                        value: datum.events?.bad,
                      })) ?? []
                    }
                  />
                </>
              ) : (
                <AreaSeries
                  id="Metric"
                  xScaleType={ScaleType.Time}
                  yScaleType={ScaleType.Linear}
                  xAccessor="date"
                  yAccessors={['value']}
                  data={(data ?? []).map((datum) => ({
                    date: new Date(datum.date).getTime(),
                    value: datum.sliValue >= 0 ? datum.sliValue : null,
                  }))}
                />
              )}
            </Chart>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

function openInDiscover(
  discover: DiscoverStart,
  slo: SLOWithSummaryResponse,
  showBad = false,
  showGood = false,
  timeRange?: { from: string; to: string; mode: 'absolute' | 'relative' }
) {
  if (slo.indicator.type === 'sli.kql.custom') {
    const filterKuery = isObject(slo.indicator.params.filter)
      ? slo.indicator.params.filter.kqlQuery
      : slo.indicator.params.filter;

    const filterFilters = isObject(slo.indicator.params.filter)
      ? slo.indicator.params.filter.filters
      : [];

    const goodKuery = isObject(slo.indicator.params.good)
      ? slo.indicator.params.good.kqlQuery
      : slo.indicator.params.good;
    const goodFilters = isObject(slo.indicator.params.good)
      ? slo.indicator.params.good.filters
      : [];
    const customGoodFilter = buildEsQuery({ kuery: goodKuery, filters: goodFilters });
    const customBadFilter = { bool: { must_not: customGoodFilter } };

    discover?.locator?.navigate({
      ...((timeRange && { timeRange }) || {}),
      query: {
        query: filterKuery || '',
        language: 'kuery',
      },
      filters: [
        ...filterFilters,
        {
          $state: { store: FilterStateStore.APP_STATE },
          meta: {
            type: 'custom',
            alias: i18n.translate('xpack.observability.slo.sloDetails.goodFilterLabel', {
              defaultMessage: 'Good events',
            }),
            disabled: !showGood,
            index: `${slo.indicator.params.index}-id`,
            value: JSON.stringify(customGoodFilter),
          },
          query: customGoodFilter as Record<string, any>,
        },
        {
          $state: { store: FilterStateStore.APP_STATE },
          meta: {
            type: 'custom',
            alias: i18n.translate('xpack.observability.slo.sloDetails.badFilterLabel', {
              defaultMessage: 'Bad events',
            }),
            disabled: !showBad,
            index: `${slo.indicator.params.index}-id`,
            value: JSON.stringify(customBadFilter),
          },
          query: customBadFilter as Record<string, any>,
        },
      ],
      dataViewSpec: {
        id: `${slo.indicator.params.index}-id`,
        title: slo.indicator.params.index,
        timeFieldName: slo.indicator.params.timestampField,
      },
    });
  }
}
