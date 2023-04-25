/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
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
import { useMetricsDataViewContext } from '../../../hooks/use_data_view';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';
import { HostsLensLineChartFormulas } from '../../../../../../common/visualizations';
import { useHostsViewContext } from '../../../hooks/use_hosts_view';
import { createHostsFilter } from '../../../utils';
import { useHostsTableContext } from '../../../hooks/use_hosts_table';
import { LensWrapper } from '../../chart/lens_wrapper';
import { useAfterLoadedState } from '../../../hooks/use_after_loaded_state';

export interface MetricChartProps {
  title: string;
  type: HostsLensLineChartFormulas;
  breakdownSize: number;
  render?: boolean;
}

const MIN_HEIGHT = 300;

export const MetricChart = ({ title, type, breakdownSize }: MetricChartProps) => {
  const { euiTheme } = useEuiTheme();
  const { searchCriteria, onSubmit } = useUnifiedSearchContext();
  const { dataView } = useMetricsDataViewContext();
  const { requestTs, loading } = useHostsViewContext();
  const { currentPage } = useHostsTableContext();

  // prevents updates on requestTs and serchCriteria states from relaoding the chart
  // we want it to reload only once the table has finished loading
  const { afterLoadedState } = useAfterLoadedState(loading, {
    lastReloadRequestTime: requestTs,
    ...searchCriteria,
  });

  const { attributes, getExtraActions, error } = useLensAttributes({
    type,
    dataView,
    options: {
      title,
      breakdownSize,
    },
    visualizationType: 'lineChart',
  });

  const hostsFilterQuery = useMemo(() => {
    return createHostsFilter(
      currentPage.map((p) => p.name),
      dataView
    );
  }, [currentPage, dataView]);

  const filters = [
    ...afterLoadedState.filters,
    ...afterLoadedState.panelFilters,
    ...[hostsFilterQuery],
  ];
  const extraActionOptions = getExtraActions({
    timeRange: afterLoadedState.dateRange,
    filters,
    query: afterLoadedState.query,
  });

  const extraActions: Action[] = [extraActionOptions.openInLens];

  const handleBrushEnd = ({ range }: BrushTriggerEvent['data']) => {
    const [min, max] = range;
    onSubmit({
      dateRange: {
        from: new Date(min).toISOString(),
        to: new Date(max).toISOString(),
        mode: 'absolute',
      },
    });
  };

  return (
    <EuiPanel
      borderRadius="m"
      hasShadow={false}
      hasBorder
      paddingSize={error ? 'm' : 'none'}
      css={css`
        min-height: calc(${MIN_HEIGHT} + ${euiTheme.size.l});
        position: 'relative';
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
          style={{ height: MIN_HEIGHT }}
          extraActions={extraActions}
          lastReloadRequestTime={afterLoadedState.lastReloadRequestTime}
          dateRange={afterLoadedState.dateRange}
          filters={filters}
          query={afterLoadedState.query}
          onBrushEnd={handleBrushEnd}
          loading={loading}
          hasTitle
        />
      )}
    </EuiPanel>
  );
};
