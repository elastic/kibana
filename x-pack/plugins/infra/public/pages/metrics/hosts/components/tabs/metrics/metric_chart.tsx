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
import { EuiPanel } from '@elastic/eui';
import { InfraClientSetupDeps } from '../../../../../../types';
import { useLensAttributes } from '../../../../../../hooks/use_lens_attributes';
import { useMetricsDataViewContext } from '../../../hooks/use_data_view';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';
import { HostLensAttributesTypes } from '../../../../../../common/visualizations';

interface Props {
  title: string;
  type: HostLensAttributesTypes;
  breakdownSize: number;
}

const HEIGHT = 300;
export const MetricChart = ({ title, type, breakdownSize }: Props) => {
  const {
    unifiedSearchDateRange,
    unifiedSearchQuery,
    unifiedSearchFilters,
    controlPanelFilters,
    onSubmit,
  } = useUnifiedSearchContext();
  const { metricsDataView } = useMetricsDataViewContext();
  const {
    services: { lens },
  } = useKibana<InfraClientSetupDeps>();

  const EmbeddableComponent = lens.EmbeddableComponent;

  const { injectData, getExtraActions } = useLensAttributes({
    type,
    dataView: metricsDataView,
    options: {
      breakdownSize,
    },
  });

  const injectedLensAttributes = injectData({
    filters: [...unifiedSearchFilters, ...controlPanelFilters],
    query: unifiedSearchQuery,
    title,
  });

  const extraActionOptions = getExtraActions(injectedLensAttributes, unifiedSearchDateRange);
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
    injectedLensAttributes && (
      <EuiPanel
        borderRadius="m"
        hasShadow={false}
        hasBorder
        paddingSize="none"
        style={{ minHeight: 300 }}
        data-test-subj={`hostsView-metricChart-${type}`}
      >
        <EmbeddableComponent
          id={`hostsViewsmetricsChart-${type}`}
          style={{ height: 300 }}
          attributes={injectedLensAttributes}
          viewMode={ViewMode.VIEW}
          timeRange={unifiedSearchDateRange}
          query={unifiedSearchQuery}
          filters={unifiedSearchFilters}
          extraActions={extraAction}
          executionContext={{
            type: 'infrastructure_observability_hosts_view',
            name: `Hosts View ${type} Chart`,
          }}
          onBrushEnd={handleBrushEnd}
        />
      </EuiPanel>
    )
  );
};
