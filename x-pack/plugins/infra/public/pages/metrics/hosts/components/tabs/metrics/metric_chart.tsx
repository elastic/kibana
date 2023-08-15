/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
<<<<<<< HEAD
import React, { useMemo } from 'react';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { XYVisualOptions } from '@kbn/lens-embeddable-utils';
import { LensChart } from '../../../../../../components/lens';
import type { UseLensAttributesXYLayerConfig } from '../../../../../../hooks/use_lens_attributes';
=======
import React, { CSSProperties, useCallback, useMemo } from 'react';
import { Action } from '@kbn/ui-actions-plugin/public';
import { BrushTriggerEvent } from '@kbn/charts-plugin/public';
import {
  EuiIcon,
  EuiPanel,
  EuiI18n,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useLensAttributes } from '../../../../../../hooks/use_lens_attributes';
>>>>>>> whats-new
import { useMetricsDataViewContext } from '../../../hooks/use_data_view';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';
import { useHostsViewContext } from '../../../hooks/use_hosts_view';
import { buildCombinedHostsFilter } from '../../../../../../utils/filters/build';
import { useHostsTableContext } from '../../../hooks/use_hosts_table';
import { useAfterLoadedState } from '../../../hooks/use_after_loaded_state';
<<<<<<< HEAD
import { METRIC_CHART_HEIGHT } from '../../../constants';
=======
import { METRIC_CHART_MIN_HEIGHT } from '../../../constants';
>>>>>>> whats-new

export interface MetricChartProps extends Pick<TypedLensByValueInput, 'id' | 'overrides'> {
  title: string;
  layers: UseLensAttributesXYLayerConfig;
  visualOptions?: XYVisualOptions;
}

<<<<<<< HEAD
export const MetricChart = ({ id, title, layers, visualOptions, overrides }: MetricChartProps) => {
  const { searchCriteria } = useUnifiedSearchContext();
=======
const lensStyle: CSSProperties = {
  height: METRIC_CHART_MIN_HEIGHT,
};

export const MetricChart = ({ title, type, breakdownSize }: MetricChartProps) => {
  const { euiTheme } = useEuiTheme();
  const { searchCriteria, onSubmit } = useUnifiedSearchContext();
>>>>>>> whats-new
  const { dataView } = useMetricsDataViewContext();
  const { requestTs, loading } = useHostsViewContext();
  const { currentPage } = useHostsTableContext();

  const shouldUseSearchCriteria = currentPage.length === 0;

<<<<<<< HEAD
  const filters = useMemo(() => {
    return shouldUseSearchCriteria
      ? searchCriteria.filters
      : [
          buildCombinedHostsFilter({
            field: 'host.name',
            values: currentPage.map((p) => p.name),
            dataView,
          }),
        ];
  }, [searchCriteria.filters, currentPage, dataView, shouldUseSearchCriteria]);

  // prevents requestTs and searchCriteria state from reloading the chart
=======
  // prevents requestTs and serchCriteria states from reloading the chart
>>>>>>> whats-new
  // we want it to reload only once the table has finished loading
  const { afterLoadedState } = useAfterLoadedState(loading, {
    lastReloadRequestTime: requestTs,
    dateRange: searchCriteria.dateRange,
    query: shouldUseSearchCriteria ? searchCriteria.query : undefined,
  });

<<<<<<< HEAD
=======
  const { attributes, getExtraActions, error } = useLensAttributes({
    type,
    dataView,
    options: {
      title,
      breakdownSize,
    },
    visualizationType: 'lineChart',
  });

  const filters = useMemo(() => {
    return shouldUseSearchCriteria
      ? afterLoadedState.filters
      : [
          buildCombinedHostsFilter({
            field: 'host.name',
            values: currentPage.map((p) => p.name),
            dataView,
          }),
        ];
  }, [afterLoadedState.filters, currentPage, dataView, shouldUseSearchCriteria]);

  const extraActions: Action[] = useMemo(
    () =>
      getExtraActions({
        timeRange: afterLoadedState.dateRange,
        query: shouldUseSearchCriteria ? afterLoadedState.query : undefined,
        filters,
      }),
    [
      afterLoadedState.dateRange,
      afterLoadedState.query,
      filters,
      getExtraActions,
      shouldUseSearchCriteria,
    ]
  );

  const handleBrushEnd = useCallback(
    ({ range }: BrushTriggerEvent['data']) => {
      const [min, max] = range;
      onSubmit({
        dateRange: {
          from: new Date(min).toISOString(),
          to: new Date(max).toISOString(),
          mode: 'absolute',
        },
      });
    },
    [onSubmit]
  );

>>>>>>> whats-new
  return (
    <LensChart
      id={`hostsView-metricChart-${id}`}
      borderRadius="m"
<<<<<<< HEAD
      dataView={dataView}
      dateRange={afterLoadedState.dateRange}
      height={METRIC_CHART_HEIGHT}
      layers={layers}
      visualOptions={visualOptions}
      lastReloadRequestTime={afterLoadedState.lastReloadRequestTime}
      loading={loading}
      filters={filters}
      query={afterLoadedState.query}
      title={title}
      overrides={overrides}
      visualizationType="lnsXY"
    />
=======
      hasShadow={false}
      hasBorder
      paddingSize={error ? 'm' : 'none'}
      css={css`
        min-height: calc(${METRIC_CHART_MIN_HEIGHT}px + ${euiTheme.size.l});
        position: relative;
      `}
      data-test-subj={`hostsView-metricChart-${type}`}
    >
      {error ? (
        <EuiFlexGroup
          style={{ minHeight: '100%', alignContent: 'center' }}
          gutterSize="xs"
          justifyContent="center"
          alignItems="center"
          direction="column"
        >
          <EuiFlexItem grow={false}>
            <EuiIcon type="warning" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" textAlign="center">
              <EuiI18n
                token="'xpack.infra.hostsViewPage.errorOnLoadingLensDependencies'"
                default="There was an error trying to load Lens Plugin."
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <LensWrapper
          id={`hostsViewsmetricsChart-${type}`}
          attributes={attributes}
          style={lensStyle}
          extraActions={extraActions}
          lastReloadRequestTime={afterLoadedState.lastReloadRequestTime}
          dateRange={afterLoadedState.dateRange}
          filters={filters}
          query={shouldUseSearchCriteria ? afterLoadedState.query : undefined}
          onBrushEnd={handleBrushEnd}
          loading={loading}
          hasTitle
        />
      )}
    </EuiPanel>
>>>>>>> whats-new
  );
};
