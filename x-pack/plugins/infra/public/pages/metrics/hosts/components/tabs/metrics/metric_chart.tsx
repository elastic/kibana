/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
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
import { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { useLensAttributes, Layer, LayerType } from '../../../../../../hooks/use_lens_attributes';
import { useMetricsDataViewContext } from '../../../hooks/use_data_view';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';
import { FormulaConfig, XYLayerOptions } from '../../../../../../common/visualizations';
import { useHostsViewContext } from '../../../hooks/use_hosts_view';
import { buildCombinedHostsFilter, buildExistsHostsFilter } from '../../../utils';
import { useHostsTableContext } from '../../../hooks/use_hosts_table';
import { LensWrapper } from '../../chart/lens_wrapper';
import { useAfterLoadedState } from '../../../hooks/use_after_loaded_state';
import { METRIC_CHART_MIN_HEIGHT } from '../../../constants';

export interface MetricChartProps extends Pick<TypedLensByValueInput, 'id' | 'overrides'> {
  title: string;
  layers: Array<Layer<XYLayerOptions, FormulaConfig[], LayerType>>;
  'data-test-subj'?: string;
}

const lensStyle: CSSProperties = {
  height: METRIC_CHART_MIN_HEIGHT,
};

export const MetricChart = ({ id, title, layers, overrides, ...props }: MetricChartProps) => {
  const { euiTheme } = useEuiTheme();
  const { searchCriteria, onSubmit } = useUnifiedSearchContext();
  const { dataView } = useMetricsDataViewContext();
  const { requestTs, loading } = useHostsViewContext();
  const { currentPage } = useHostsTableContext();

  // prevents requestTs and serchCriteria states from reloading the chart
  // we want it to reload only once the table has finished loading
  const { afterLoadedState } = useAfterLoadedState(loading, {
    lastReloadRequestTime: requestTs,
    ...searchCriteria,
  });

  const { attributes, getExtraActions, error } = useLensAttributes({
    dataView,
    layers,
    title,
    visualizationType: 'lnsXY',
  });

  const filters = useMemo(() => {
    return [
      ...searchCriteria.filters,
      buildCombinedHostsFilter({
        field: 'host.name',
        values: currentPage.map((p) => p.name),
        dataView,
      }),
      buildExistsHostsFilter({ field: 'host.name', dataView }),
    ];
  }, [currentPage, dataView, searchCriteria.filters]);

  const extraActions: Action[] = useMemo(
    () =>
      getExtraActions({
        timeRange: afterLoadedState.dateRange,
        query: afterLoadedState.query,
        filters,
      }),
    [afterLoadedState.dateRange, afterLoadedState.query, filters, getExtraActions]
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

  return (
    <EuiPanel
      borderRadius="m"
      hasShadow={false}
      hasBorder
      paddingSize={error ? 'm' : 'none'}
      css={css`
        min-height: calc(${METRIC_CHART_MIN_HEIGHT}px + ${euiTheme.size.l});
        position: relative;
      `}
      data-test-subj={props['data-test-subj']}
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
          id={id}
          attributes={attributes}
          style={lensStyle}
          extraActions={extraActions}
          lastReloadRequestTime={afterLoadedState.lastReloadRequestTime}
          dateRange={afterLoadedState.dateRange}
          filters={filters}
          query={afterLoadedState.query}
          onBrushEnd={handleBrushEnd}
          loading={loading}
          overrides={overrides}
          hasTitle
        />
      )}
    </EuiPanel>
  );
};
