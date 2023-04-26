/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { Filter, Query, TimeRange } from '@kbn/es-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { i18n } from '@kbn/i18n';
import useAsync from 'react-use/lib/useAsync';
import { InfraClientSetupDeps } from '../types';
import {
  buildLensAttributes,
  HostsLensFormulas,
  HostsLensMetricChartFormulas,
  HostsLensLineChartFormulas,
  LineChartOptions,
  MetricChartOptions,
  LensAttributes,
  hostLensFormulas,
  visualizationTypes,
} from '../common/visualizations';

type Options = LineChartOptions | MetricChartOptions;
interface UseLensAttributesBaseParams<T extends HostsLensFormulas, O extends Options> {
  dataView: DataView | undefined;
  type: T;
  options?: O;
}

interface UseLensAttributesLineChartParams
  extends UseLensAttributesBaseParams<HostsLensLineChartFormulas, LineChartOptions> {
  visualizationType: 'lineChart';
}

interface UseLensAttributesMetricChartParams
  extends UseLensAttributesBaseParams<HostsLensMetricChartFormulas, MetricChartOptions> {
  visualizationType: 'metricChart';
}

type UseLensAttributesParams =
  | UseLensAttributesLineChartParams
  | UseLensAttributesMetricChartParams;

export const useLensAttributes = ({
  type,
  dataView,
  options,
  visualizationType,
}: UseLensAttributesParams) => {
  const {
    services: { lens },
  } = useKibana<InfraClientSetupDeps>();
  const { navigateToPrefilledEditor } = lens;
  const { value, error } = useAsync(lens.stateHelperApi, [lens]);
  const { formula: formulaAPI } = value ?? {};

  const attributes = useMemo(() => {
    if (!dataView || !formulaAPI) {
      return null;
    }

    const lensChartConfig = hostLensFormulas[type];
    const VisualizationType = visualizationTypes[visualizationType];

    const visualizationAttributes = buildLensAttributes(
      new VisualizationType(lensChartConfig, dataView, formulaAPI, options)
    );

    return visualizationAttributes;
  }, [dataView, formulaAPI, options, type, visualizationType]);

  const injectFilters = (data: { filters: Filter[]; query: Query }): LensAttributes | null => {
    if (!attributes) {
      return null;
    }
    return {
      ...attributes,
      state: {
        ...attributes.state,
        query: data.query,
        filters: [...attributes.state.filters, ...data.filters],
      },
    };
  };

  const getExtraActions = ({
    timeRange,
    filters,
    query,
  }: {
    timeRange: TimeRange;
    filters: Filter[];
    query: Query;
  }) => {
    return {
      openInLens: {
        id: 'openInLens',

        getDisplayName(_context: ActionExecutionContext): string {
          return i18n.translate(
            'xpack.infra.hostsViewPage.tabs.metricsCharts.actions.openInLines',
            {
              defaultMessage: 'Open in Lens',
            }
          );
        },
        getIconType(_context: ActionExecutionContext): string | undefined {
          return 'visArea';
        },
        type: 'actionButton',
        async isCompatible(_context: ActionExecutionContext): Promise<boolean> {
          return true;
        },
        async execute(_context: ActionExecutionContext): Promise<void> {
          const injectedAttributes = injectFilters({ filters, query });
          if (injectedAttributes) {
            navigateToPrefilledEditor(
              {
                id: '',
                timeRange,
                attributes: injectedAttributes,
              },
              {
                openInNewTab: true,
              }
            );
          }
        },
        order: 100,
      },
    };
  };

  return { attributes, getExtraActions, error };
};
