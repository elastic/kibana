/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { Action } from '@kbn/ui-actions-plugin/public';
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
  subtitle,
  type,
  backgroundColor,
  toolTip,
  trendLine = false,
}: KPIChartProps) => {
  const { searchCriteria, onSubmit } = useUnifiedSearchContext();
  const { dataView } = useMetricsDataViewContext();
  const { baseRequest } = useHostsViewContext();

  const { attributes, getExtraActions, error } = useLensAttributes({
    type,
    dataView,
    options: {
      title,
      subtitle,
      backgroundColor,
      showTrendLine: trendLine,
      showTitle: false,
    },
    visualizationType: 'metricChart',
  });

  const filters = [...searchCriteria.filters, ...searchCriteria.panelFilters];
  const extraActionOptions = getExtraActions({
    timeRange: searchCriteria.dateRange,
    filters,
    query: searchCriteria.query,
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
            attributes={attributes}
            style={{ height: MIN_HEIGHT }}
            extraActions={extraActions}
            lastReloadRequestTime={baseRequest.requestTs}
            dateRange={searchCriteria.dateRange}
            filters={filters}
            query={searchCriteria.query}
            onBrushEnd={handleBrushEnd}
          />
        </EuiToolTip>
      )}
    </EuiPanelStyled>
  );
};

const EuiPanelStyled = styled(EuiPanel)`
  .echMetric {
    border-radius: ${(p) => p.theme.eui.euiBorderRadius};
    pointer-events: none;
  }
`;
