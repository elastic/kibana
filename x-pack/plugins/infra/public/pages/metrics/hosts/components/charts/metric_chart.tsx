/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import moment from 'moment';
import { BrushTriggerEvent } from '@kbn/charts-plugin/public';
import { EuiPanel } from '@elastic/eui';
import { InfraClientSetupDeps } from '../../../../../types';
import { useLensAttributes } from '../../../../../hooks/use_lens_attributes';
import { useMetricsDataViewContext } from '../../hooks/use_data_view';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';
import {
  HostLensAttributesTypes,
  hostMetricsLensAttributes,
} from '../../visualizations/lens_attributes';

interface Props {
  type: HostLensAttributesTypes;
}
export const MetricChart = ({ type }: Props) => {
  const { unifiedSearchDateRange, unifiedSearchQuery, unifiedSearchFilters, onSubmit } =
    useUnifiedSearchContext();
  const { metricsDataView } = useMetricsDataViewContext();
  const {
    services: { lens },
  } = useKibana<InfraClientSetupDeps>();

  const EmbeddableComponent = lens.EmbeddableComponent;
  const { navigateToPrefilledEditor } = lens;

  const attributes = hostMetricsLensAttributes[type];

  const attributesWithInjectedData = useLensAttributes({
    dataView: metricsDataView,
    attributes,
    query: unifiedSearchQuery,
    filters: unifiedSearchFilters,
  });

  const handleBrushEnd = (data: BrushTriggerEvent['data']) => {
    onSubmit({
      dateRange: {
        from: moment.unix(data.range[0] / 1000).toISOString(),
        to: moment.unix(data.range[1] / 1000).toISOString(),
        mode: 'absolute',
      },
    });
  };

  const extraAction: Action[] = [
    {
      id: 'openInLens',

      getDisplayName(_context: ActionExecutionContext): string {
        return 'Open in Lens';
      },
      getIconType(_context: ActionExecutionContext): string | undefined {
        return 'visArea';
      },
      type: 'actionButton',
      async isCompatible(_context: ActionExecutionContext): Promise<boolean> {
        return true;
      },
      async execute(_context: ActionExecutionContext): Promise<void> {
        if (attributesWithInjectedData) {
          navigateToPrefilledEditor(
            {
              id: '',
              timeRange: unifiedSearchDateRange,
              attributes: attributesWithInjectedData,
            },
            {
              openInNewTab: true,
              skipAppLeave: true,
            }
          );
        }
      },
      order: 100,
    },
  ];

  return (
    attributesWithInjectedData && (
      <EuiPanel
        borderRadius="m"
        hasShadow={false}
        hasBorder
        paddingSize="none"
        style={{ minHeight: 300 }}
      >
        <EmbeddableComponent
          id={`changePointChart_1`}
          style={{ height: 300 }}
          attributes={attributesWithInjectedData}
          timeRange={unifiedSearchDateRange}
          viewMode={ViewMode.VIEW}
          query={unifiedSearchQuery}
          filters={unifiedSearchFilters}
          extraActions={extraAction}
          onBrushEnd={handleBrushEnd}
          executionContext={{
            type: 'aiops_change_point_detection_chart',
            name: 'Change point detection',
          }}
        />
      </EuiPanel>
    )
  );
};
