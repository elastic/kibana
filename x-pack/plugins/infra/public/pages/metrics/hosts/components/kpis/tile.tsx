/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
<<<<<<< HEAD
import React, { useMemo } from 'react';
=======
import React, { CSSProperties, useMemo, useCallback } from 'react';

>>>>>>> whats-new
import { i18n } from '@kbn/i18n';
import { LensChart, TooltipContent } from '../../../../../components/lens';
import {
<<<<<<< HEAD
  type KPIChartProps,
  AVERAGE_SUBTITLE,
} from '../../../../../common/visualizations/lens/dashboards/host/kpi_grid_config';
import { buildCombinedHostsFilter } from '../../../../../utils/filters/build';
=======
  EuiIcon,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiI18n,
  EuiToolTip,
} from '@elastic/eui';
import styled from 'styled-components';
import { Action } from '@kbn/ui-actions-plugin/public';
import { useLensAttributes } from '../../../../../hooks/use_lens_attributes';
>>>>>>> whats-new
import { useMetricsDataViewContext } from '../../hooks/use_data_view';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';
import { useHostsViewContext } from '../../hooks/use_hosts_view';
import { useHostCountContext } from '../../hooks/use_host_count';
import { useAfterLoadedState } from '../../hooks/use_after_loaded_state';
<<<<<<< HEAD
=======
import { TooltipContent } from '../metric_explanation/tooltip_content';
import { KPI_CHART_MIN_HEIGHT } from '../../constants';

export interface KPIChartProps {
  title: string;
  subtitle?: string;
  trendLine?: boolean;
  backgroundColor: string;
  type: HostsLensMetricChartFormulas;
  decimals?: number;
  toolTip: string;
  style?: CSSProperties;
}
>>>>>>> whats-new

export const Tile = ({
  id,
  title,
  layers,
  toolTip,
<<<<<<< HEAD
  height,
}: KPIChartProps & { height: number }) => {
  const { searchCriteria } = useUnifiedSearchContext();
=======
  style,
  decimals = 1,
  trendLine = false,
}: KPIChartProps) => {
  const { searchCriteria, onSubmit } = useUnifiedSearchContext();
>>>>>>> whats-new
  const { dataView } = useMetricsDataViewContext();
  const { requestTs, hostNodes, loading: hostsLoading } = useHostsViewContext();
  const { data: hostCountData, isRequestRunning: hostCountLoading } = useHostCountContext();

  const shouldUseSearchCriteria = hostNodes.length === 0;

<<<<<<< HEAD
  const loading = hostsLoading || hostCountLoading;

=======
>>>>>>> whats-new
  const getSubtitle = () => {
    return searchCriteria.limit < (hostCountData?.count.value ?? 0)
      ? i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.average.limit', {
          defaultMessage: 'Average (of {limit} hosts)',
          values: {
            limit: searchCriteria.limit,
          },
        })
      : AVERAGE_SUBTITLE;
  };

  const filters = useMemo(() => {
    return shouldUseSearchCriteria
      ? searchCriteria.filters
      : [
          buildCombinedHostsFilter({
            field: 'host.name',
            values: hostNodes.map((p) => p.name),
            dataView,
          }),
        ];
<<<<<<< HEAD
  }, [dataView, hostNodes, searchCriteria.filters, shouldUseSearchCriteria]);

  // prevents requestTs and searchCriteria state from reloading the chart
  // we want it to reload only once the table has finished loading
=======
  }, [shouldUseSearchCriteria, searchCriteria.filters, hostNodes, dataView]);

  const loading = hostsLoading || !attributes || hostCountLoading;

  // prevents requestTs and serchCriteria states from reloading the chart
  // we want it to reload only once the host count and table have finished loading
>>>>>>> whats-new
  const { afterLoadedState } = useAfterLoadedState(loading, {
    lastReloadRequestTime: requestTs,
    dateRange: searchCriteria.dateRange,
    query: shouldUseSearchCriteria ? searchCriteria.query : undefined,
    filters,
  });

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

  return (
<<<<<<< HEAD
    <LensChart
      id={`hostsViewKPI-${id}`}
      dataView={dataView}
      dateRange={afterLoadedState.dateRange}
      filters={afterLoadedState.filters}
      layers={{ ...layers, options: { ...layers.options, subtitle: getSubtitle() } }}
      lastReloadRequestTime={afterLoadedState.lastReloadRequestTime}
      loading={loading}
      height={height}
      query={afterLoadedState.query}
      title={title}
      toolTip={<TooltipContent description={toolTip} />}
      visualizationType="lnsMetric"
      disableTriggers
      hidePanelTitles
    />
  );
};
=======
    <EuiPanelStyled
      hasShadow={false}
      paddingSize={error ? 'm' : 'none'}
      data-test-subj={`hostsViewKPI-${type}`}
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
        <EuiToolTip
          delay="regular"
          content={<TooltipContent formula={formula} description={toolTip} />}
          anchorClassName="eui-fullWidth"
        >
          <div>
            <LensWrapper
              id={`hostsViewKPIGrid${type}Tile`}
              attributes={afterLoadedState.attributes}
              style={style}
              extraActions={extraActions}
              lastReloadRequestTime={afterLoadedState.lastReloadRequestTime}
              dateRange={afterLoadedState.dateRange}
              filters={afterLoadedState.filters}
              query={shouldUseSearchCriteria ? afterLoadedState.query : undefined}
              onBrushEnd={handleBrushEnd}
              loading={loading}
            />
          </div>
        </EuiToolTip>
      )}
    </EuiPanelStyled>
  );
};

const EuiPanelStyled = styled(EuiPanel)`
  min-height: ${KPI_CHART_MIN_HEIGHT};
  .echMetric {
    border-radius: ${({ theme }) => theme.eui.euiBorderRadius};
    pointer-events: none;
  }
`;
>>>>>>> whats-new
