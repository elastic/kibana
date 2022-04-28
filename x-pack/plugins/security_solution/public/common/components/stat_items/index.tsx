/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScaleType, Rotation, BrushEndListener, ElementClickListener } from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiHorizontalRule,
  EuiIcon,
  EuiButtonIcon,
  EuiLoadingSpinner,
  EuiTitle,
  IconType,
} from '@elastic/eui';
import { get, getOr } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';
import { useQueryToggle } from '../../containers/query_toggle';

import {
  HostsKpiStrategyResponse,
  NetworkKpiStrategyResponse,
} from '../../../../common/search_strategy';
import { AreaChart } from '../charts/areachart';
import { BarChart } from '../charts/barchart';
import { ChartSeriesData, ChartData, ChartSeriesConfigs, UpdateDateRange } from '../charts/common';
import { histogramDateTimeFormatter } from '../utils';
import { getEmptyTagValue } from '../empty_value';

import { InspectButton } from '../inspect';
import { VisualizationActions, HISTOGRAM_ACTIONS_BUTTON_CLASS } from '../visualization_actions';
import { HoverVisibilityContainer } from '../hover_visibility_container';
import { LensAttributes } from '../visualization_actions/types';
import * as i18n from '../../containers/query_toggle/translations';
import { UserskKpiStrategyResponse } from '../../../../common/search_strategy/security_solution/users';

const FlexItem = styled(EuiFlexItem)`
  min-width: 0;
  position: relative;
`;

FlexItem.displayName = 'FlexItem';

const StatValue = styled(EuiTitle)`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

StatValue.displayName = 'StatValue';

interface StatItem {
  color?: string;
  description?: string;
  icon?: IconType;
  key: string;
  name?: string;
  value: number | undefined | null;
  lensAttributes?: LensAttributes;
}

export interface StatItems {
  areachartConfigs?: ChartSeriesConfigs;
  barchartConfigs?: ChartSeriesConfigs;
  description?: string;
  enableAreaChart?: boolean;
  enableBarChart?: boolean;
  fields: StatItem[];
  grow?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | true | false | null;
  index?: number;
  key: string;
  statKey?: string;
  barChartLensAttributes?: LensAttributes;
  areaChartLensAttributes?: LensAttributes;
}

export interface StatItemsProps extends StatItems {
  areaChart?: ChartSeriesData[];
  barChart?: ChartSeriesData[];
  from: string;
  id: string;
  narrowDateRange: UpdateDateRange;
  to: string;
  showInspectButton?: boolean;
  loading: boolean;
  setQuerySkip: (skip: boolean) => void;
}

export const numberFormatter = (value: string | number): string => value.toLocaleString();
const statItemBarchartRotation: Rotation = 90;
const statItemChartCustomHeight = 74;

export const areachartConfigs = (config?: {
  xTickFormatter: (value: number) => string;
  onBrushEnd?: BrushEndListener;
}) => ({
  series: {
    xScaleType: ScaleType.Time,
    yScaleType: ScaleType.Linear,
  },
  axis: {
    xTickFormatter: get('xTickFormatter', config),
    yTickFormatter: numberFormatter,
  },
  settings: {
    onBrushEnd: getOr(() => {}, 'onBrushEnd', config),
  },
  customHeight: statItemChartCustomHeight,
});

export const barchartConfigs = (config?: { onElementClick?: ElementClickListener }) => ({
  series: {
    xScaleType: ScaleType.Ordinal,
    yScaleType: ScaleType.Linear,
    stackAccessors: ['y0'],
  },
  axis: {
    xTickFormatter: numberFormatter,
  },
  settings: {
    onElementClick: getOr(() => {}, 'onElementClick', config),
    rotation: statItemBarchartRotation,
  },
  customHeight: statItemChartCustomHeight,
});

export const addValueToFields = (
  fields: StatItem[],
  data: HostsKpiStrategyResponse | NetworkKpiStrategyResponse | UserskKpiStrategyResponse
): StatItem[] => fields.map((field) => ({ ...field, value: get(field.key, data) }));

export const addValueToAreaChart = (
  fields: StatItem[],
  data: HostsKpiStrategyResponse | NetworkKpiStrategyResponse | UserskKpiStrategyResponse
): ChartSeriesData[] =>
  fields
    .filter((field) => get(`${field.key}Histogram`, data) != null)
    .map(({ lensAttributes, ...field }) => ({
      ...field,
      value: get(`${field.key}Histogram`, data),
      key: `${field.key}Histogram`,
    }));

export const addValueToBarChart = (
  fields: StatItem[],
  data: HostsKpiStrategyResponse | NetworkKpiStrategyResponse | UserskKpiStrategyResponse
): ChartSeriesData[] => {
  if (fields.length === 0) return [];
  return fields.reduce((acc: ChartSeriesData[], field: StatItem, idx: number) => {
    const { key, color } = field;
    const y: number | null = getOr(null, key, data);
    const x: string = get(`${idx}.name`, fields) || getOr('', `${idx}.description`, fields);
    const value: [ChartData] = [
      {
        x,
        y,
        g: key,
        y0: 0,
      },
    ];

    return [
      ...acc,
      {
        key,
        color,
        value,
      },
    ];
  }, []);
};

export const useKpiMatrixStatus = (
  mappings: Readonly<StatItems[]>,
  data: HostsKpiStrategyResponse | NetworkKpiStrategyResponse | UserskKpiStrategyResponse,
  id: string,
  from: string,
  to: string,
  narrowDateRange: UpdateDateRange,
  setQuerySkip: (skip: boolean) => void,
  loading: boolean
): StatItemsProps[] =>
  mappings.map((stat) => ({
    ...stat,
    areaChart: stat.enableAreaChart ? addValueToAreaChart(stat.fields, data) : undefined,
    barChart: stat.enableBarChart ? addValueToBarChart(stat.fields, data) : undefined,
    fields: addValueToFields(stat.fields, data),
    id,
    key: `kpi-summary-${stat.key}`,
    statKey: `${stat.key}`,
    from,
    to,
    narrowDateRange,
    setQuerySkip,
    loading,
  }));
const StyledTitle = styled.h6`
  line-height: 200%;
`;
export const StatItemsComponent = React.memo<StatItemsProps>(
  ({
    areaChart,
    barChart,
    description,
    enableAreaChart,
    enableBarChart,
    fields,
    from,
    grow,
    id,
    loading = false,
    showInspectButton = true,
    index,
    narrowDateRange,
    statKey = 'item',
    to,
    barChartLensAttributes,
    areaChartLensAttributes,
    setQuerySkip,
  }) => {
    const isBarChartDataAvailable =
      barChart &&
      barChart.length &&
      barChart.every((item) => item.value != null && item.value.length > 0);
    const isAreaChartDataAvailable =
      areaChart &&
      areaChart.length &&
      areaChart.every((item) => item.value != null && item.value.length > 0);

    const timerange = useMemo(
      () => ({
        from,
        to,
      }),
      [from, to]
    );

    const { toggleStatus, setToggleStatus } = useQueryToggle(id);

    const toggleQuery = useCallback(
      (status: boolean) => {
        setToggleStatus(status);
        // toggle on = skipQuery false
        setQuerySkip(!status);
      },
      [setQuerySkip, setToggleStatus]
    );
    const toggle = useCallback(() => toggleQuery(!toggleStatus), [toggleQuery, toggleStatus]);

    return (
      <FlexItem grow={grow} data-test-subj={`stat-${statKey}`}>
        <EuiPanel hasBorder>
          <EuiFlexGroup gutterSize={'none'}>
            <EuiFlexItem>
              <EuiFlexGroup gutterSize={'none'}>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    aria-label={i18n.QUERY_BUTTON_TITLE(toggleStatus)}
                    data-test-subj="query-toggle-stat"
                    color="text"
                    display="empty"
                    iconType={toggleStatus ? 'arrowDown' : 'arrowRight'}
                    onClick={toggle}
                    size="xs"
                    title={i18n.QUERY_BUTTON_TITLE(toggleStatus)}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle size="xxxs">
                    <StyledTitle>{description}</StyledTitle>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {showInspectButton && toggleStatus && !loading && (
              <EuiFlexItem grow={false}>
                <InspectButton queryId={id} title={description} inspectIndex={index} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          {loading && (
            <EuiFlexGroup justifyContent="center" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="l" />
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          {toggleStatus && !loading && (
            <>
              <EuiFlexGroup>
                {fields.map((field) => (
                  <FlexItem key={`stat-items-field-${field.key}`}>
                    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                      {(isAreaChartDataAvailable || isBarChartDataAvailable) && field.icon && (
                        <FlexItem grow={false}>
                          <EuiIcon
                            type={field.icon}
                            color={field.color}
                            size="l"
                            data-test-subj="stat-icon"
                          />
                        </FlexItem>
                      )}

                      <FlexItem>
                        <HoverVisibilityContainer
                          targetClassNames={[HISTOGRAM_ACTIONS_BUTTON_CLASS]}
                        >
                          <StatValue>
                            <p data-test-subj="stat-title">
                              {field.value != null
                                ? field.value.toLocaleString()
                                : getEmptyTagValue()}{' '}
                              {field.description}
                            </p>
                          </StatValue>
                          {field.lensAttributes && timerange && (
                            <VisualizationActions
                              lensAttributes={field.lensAttributes}
                              queryId={id}
                              inspectIndex={index}
                              timerange={timerange}
                              title={description}
                              className="viz-actions"
                            />
                          )}
                        </HoverVisibilityContainer>
                      </FlexItem>
                    </EuiFlexGroup>
                  </FlexItem>
                ))}
              </EuiFlexGroup>

              {(enableAreaChart || enableBarChart) && <EuiHorizontalRule />}
              <EuiFlexGroup>
                {enableBarChart && (
                  <FlexItem>
                    <BarChart
                      barChart={barChart}
                      configs={barchartConfigs()}
                      visualizationActionsOptions={{
                        lensAttributes: barChartLensAttributes,
                        queryId: id,
                        inspectIndex: index,
                        timerange,
                        title: description,
                      }}
                    />
                  </FlexItem>
                )}

                {enableAreaChart && from != null && to != null && (
                  <>
                    <FlexItem>
                      <AreaChart
                        areaChart={areaChart}
                        configs={areachartConfigs({
                          xTickFormatter: histogramDateTimeFormatter([from, to]),
                          onBrushEnd: narrowDateRange,
                        })}
                        visualizationActionsOptions={{
                          lensAttributes: areaChartLensAttributes,
                          queryId: id,
                          inspectIndex: index,
                          timerange,
                          title: description,
                        }}
                      />
                    </FlexItem>
                  </>
                )}
              </EuiFlexGroup>
            </>
          )}
        </EuiPanel>
      </FlexItem>
    );
  },
  (prevProps, nextProps) =>
    prevProps.description === nextProps.description &&
    prevProps.enableAreaChart === nextProps.enableAreaChart &&
    prevProps.enableBarChart === nextProps.enableBarChart &&
    prevProps.from === nextProps.from &&
    prevProps.grow === nextProps.grow &&
    prevProps.loading === nextProps.loading &&
    prevProps.setQuerySkip === nextProps.setQuerySkip &&
    prevProps.id === nextProps.id &&
    prevProps.index === nextProps.index &&
    prevProps.narrowDateRange === nextProps.narrowDateRange &&
    prevProps.statKey === nextProps.statKey &&
    prevProps.to === nextProps.to &&
    deepEqual(prevProps.areaChart, nextProps.areaChart) &&
    deepEqual(prevProps.barChart, nextProps.barChart) &&
    deepEqual(prevProps.fields, nextProps.fields)
);

StatItemsComponent.displayName = 'StatItemsComponent';
