/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import { BrushTriggerEvent } from '@kbn/charts-plugin/public';
import {
  EuiIcon,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiI18n,
  EuiToolTip,
} from '@elastic/eui';
import styled from 'styled-components';
import { useLensAttributes } from '../../../../../hooks/use_lens_attributes';
import { useMetricsDataViewContext } from '../../hooks/use_data_view';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';
import { HostsLensMetricChartFormulas } from '../../../../../common/visualizations';
import { useHostsViewContext } from '../../hooks/use_hosts_view';
import { LensWrapper } from '../chart/lens_wrapper';
import { createHostsFilter } from '../../utils';
import { useHostCountContext } from '../../hooks/use_host_count';
import { useAfterLoadedState } from '../../hooks/use_after_loaded_state';

export interface KPIChartProps {
  title: string;
  subtitle?: string;
  trendLine?: boolean;
  backgroundColor: string;
  type: HostsLensMetricChartFormulas;
  toolTip: string;
}

const MIN_HEIGHT = 150;

export const Tile = ({
  title,
  type,
  backgroundColor,
  toolTip,
  trendLine = false,
}: KPIChartProps) => {
  const { searchCriteria, onSubmit } = useUnifiedSearchContext();
  const { dataView } = useMetricsDataViewContext();
  const { requestTs, hostNodes, loading: hostsLoading } = useHostsViewContext();
  const { data: hostCountData, isRequestRunning: hostCountLoading } = useHostCountContext();

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

  const { attributes, getExtraActions, error } = useLensAttributes({
    type,
    dataView,
    options: {
      title,
      subtitle: getSubtitle(),
      backgroundColor,
      showTrendLine: trendLine,
      showTitle: false,
    },
    visualizationType: 'metricChart',
  });

  const hostsFilterQuery = useMemo(() => {
    return createHostsFilter(
      hostNodes.map((p) => p.name),
      dataView
    );
  }, [hostNodes, dataView]);

  const filters = useMemo(
    () => [...searchCriteria.filters, ...searchCriteria.panelFilters, ...[hostsFilterQuery]],
    [hostsFilterQuery, searchCriteria.filters, searchCriteria.panelFilters]
  );

  const extraActionOptions = getExtraActions({
    timeRange: searchCriteria.dateRange,
    filters,
    query: searchCriteria.query,
  });

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

  const loading = hostsLoading || !attributes || hostCountLoading;
  const { afterLoadedState } = useAfterLoadedState(loading, {
    attributes,
    lastReloadRequestTime: requestTs,
    ...searchCriteria,
    filters,
  });

  return (
    <EuiPanelStyled
      hasShadow={false}
      paddingSize={error ? 'm' : 'none'}
      style={{ minHeight: MIN_HEIGHT }}
      data-test-subj={`hostsView-metricsTrend-${type}`}
    >
      {error ? (
        <EuiFlexGroup
          style={{ height: MIN_HEIGHT, alignContent: 'center' }}
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
          className="eui-fullWidth"
          delay="regular"
          content={toolTip}
          anchorClassName="eui-fullWidth"
        >
          <LensWrapper
            id={`hostViewKPIChart-${type}`}
            attributes={afterLoadedState.attributes}
            style={{ height: MIN_HEIGHT }}
            extraActions={[extraActionOptions.openInLens]}
            lastReloadRequestTime={afterLoadedState.lastReloadRequestTime}
            dateRange={afterLoadedState.dateRange}
            filters={afterLoadedState.filters}
            query={afterLoadedState.query}
            onBrushEnd={handleBrushEnd}
            loading={loading}
          />
        </EuiToolTip>
      )}
    </EuiPanelStyled>
  );
};

const EuiPanelStyled = styled(EuiPanel)`
  .echMetric {
    border-radius: ${({ theme }) => theme.eui.euiBorderRadius};
    pointer-events: none;
  }
`;
