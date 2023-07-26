/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useCallback } from 'react';

import { i18n } from '@kbn/i18n';
import { BrushTriggerEvent } from '@kbn/charts-plugin/public';
import { EuiIcon, EuiPanel, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import styled from 'styled-components';
import { Action } from '@kbn/ui-actions-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { KPIChartProps } from '../../../../../common/visualizations/lens/dashboards/host/kpi_grid_config';
import { buildCombinedHostsFilter } from '../../../../../utils/filters/build';
import { useLensAttributes } from '../../../../../hooks/use_lens_attributes';
import { useMetricsDataViewContext } from '../../hooks/use_data_view';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';
import { useHostsViewContext } from '../../hooks/use_hosts_view';
import { LensWrapper } from '../../../../../common/visualizations/lens/lens_wrapper';
import { useHostCountContext } from '../../hooks/use_host_count';
import { useAfterLoadedState } from '../../hooks/use_after_loaded_state';
import { TooltipContent } from '../../../../../common/visualizations/metric_explanation/tooltip_content';
import { KPI_CHART_MIN_HEIGHT } from '../../constants';

export const Tile = ({ id, title, layers, style, toolTip, ...props }: KPIChartProps) => {
  const { searchCriteria, onSubmit } = useUnifiedSearchContext();
  const { dataView } = useMetricsDataViewContext();
  const { requestTs, hostNodes, loading: hostsLoading } = useHostsViewContext();
  const { data: hostCountData, isRequestRunning: hostCountLoading } = useHostCountContext();

  const shouldUseSearchCriteria = hostNodes.length === 0;

  const getSubtitle = () => {
    return searchCriteria.limit < (hostCountData?.count.value ?? 0)
      ? i18n.translate('xpack.infra.hostsViewPage.metricTrend.subtitle.average.limit', {
          defaultMessage: 'Average (of {limit} hosts)',
          values: {
            limit: searchCriteria.limit,
          },
        })
      : i18n.translate('xpack.infra.hostsViewPage.metricTrend.subtitle.average', {
          defaultMessage: 'Average',
        });
  };

  const { formula, attributes, getExtraActions, error } = useLensAttributes({
    dataView,
    title,
    layers: { ...layers, options: { ...layers.options, subtitle: getSubtitle() } },
    visualizationType: 'lnsMetric',
  });

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
  }, [shouldUseSearchCriteria, searchCriteria.filters, hostNodes, dataView]);

  const loading = hostsLoading || !attributes || hostCountLoading;

  // prevents requestTs and serchCriteria states from reloading the chart
  // we want it to reload only once the host count and table have finished loading
  const { afterLoadedState } = useAfterLoadedState(loading, {
    attributes,
    lastReloadRequestTime: requestTs,
    ...searchCriteria,
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
    <EuiPanelStyled
      hasShadow={false}
      paddingSize={error ? 'm' : 'none'}
      data-test-subj={`hostsViewKPI-${id}`}
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
              <FormattedMessage
                id="xpack.infra.hostsViewPage.errorOnLoadingLensDependencies"
                defaultMessage="There was an error trying to load Lens Plugin."
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
              id={`hostsViewKPIGrid${id}Tile`}
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
