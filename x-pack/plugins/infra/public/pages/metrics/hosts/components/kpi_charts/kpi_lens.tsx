/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import { Action } from '@kbn/ui-actions-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { BrushTriggerEvent } from '@kbn/charts-plugin/public';
import { EuiIcon, EuiPanel } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { EuiI18n } from '@elastic/eui';
import styled from 'styled-components';
import { InfraClientSetupDeps } from '../../../../../types';
import { useLensAttributes } from '../../../../../hooks/use_lens_attributes';
import { useMetricsDataViewContext } from '../../hooks/use_data_view';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';
import { HostsLensMetricChartFormulas } from '../../../../../common/visualizations';
import { useHostsViewContext } from '../../hooks/use_hosts_view';

export interface KPIChartProps {
  title: string;
  subtitle?: string;
  backgroundColor: string;
  trendA11yDescription?: string;
  trendA11yTitle?: string;
  type: HostsLensMetricChartFormulas;
  trendLine?: boolean;
  toolTip: string;
}

const MIN_HEIGHT = 150;

export const KPILens = ({
  title,
  subtitle,
  type,
  backgroundColor,
  trendLine = false,
}: KPIChartProps) => {
  const { searchCriteria, onSubmit } = useUnifiedSearchContext();
  const { dataView } = useMetricsDataViewContext();
  const { baseRequest } = useHostsViewContext();
  const {
    services: { lens },
  } = useKibana<InfraClientSetupDeps>();

  const EmbeddableComponent = lens.EmbeddableComponent;

  const { injectFilters, getExtraActions, error } = useLensAttributes({
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

  const injectedLensAttributes = injectFilters({
    filters: [...searchCriteria.filters, ...searchCriteria.panelFilters],
    query: searchCriteria.query,
  });

  const extraActionOptions = getExtraActions(injectedLensAttributes, searchCriteria.dateRange);
  const extraAction: Action[] = [extraActionOptions.openInLens];

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
      borderRadius="m"
      hasShadow={false}
      hasBorder
      paddingSize={error ? 'm' : 'none'}
      style={{ minHeight: MIN_HEIGHT }}
      data-test-subj={`hostsView-kpiChart-${type}`}
    >
      {error ? (
        <EuiFlexGroup
          style={{ minHeight: MIN_HEIGHT, alignContent: 'center' }}
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
        injectedLensAttributes && (
          <EmbeddableComponent
            id={`hostsViewsmetricsChart-${type}`}
            style={{
              height: MIN_HEIGHT,
            }}
            attributes={injectedLensAttributes}
            viewMode={ViewMode.VIEW}
            timeRange={searchCriteria.dateRange}
            query={searchCriteria.query}
            filters={searchCriteria.filters}
            extraActions={extraAction}
            lastReloadRequestTime={baseRequest.requestTs}
            executionContext={{
              type: 'visualization',
              name: `Hosts View KPI Chart`,
            }}
            onBrushEnd={handleBrushEnd}
          />
        )
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
