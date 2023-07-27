/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { Filter, Query, TimeRange } from '@kbn/es-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { i18n } from '@kbn/i18n';
import useAsync from 'react-use/lib/useAsync';
import { InfraClientSetupDeps } from '../types';
import {
  type HostsLensFormulas,
  type HostsLensMetricChartFormulas,
  type HostsLensLineChartFormulas,
  type LineChartOptions,
  type MetricChartOptions,
  LensAttributesBuilder,
  LensAttributes,
  hostLensFormulas,
  visualizationTypes,
} from '../common/visualizations';
import { useLazyRef } from './use_lazy_ref';

type Options = LineChartOptions | MetricChartOptions;
interface UseLensAttributesBaseParams<T extends HostsLensFormulas, O extends Options> {
  dataView?: DataView;
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

  const lensChartConfig = hostLensFormulas[type];
  const Chart = visualizationTypes[visualizationType];

  const attributes = useLazyRef(() => {
    if (!dataView || !formulaAPI) {
      return null;
    }

    const builder = new LensAttributesBuilder(
      new Chart(lensChartConfig, dataView, formulaAPI, options)
    );

    return builder.build();
  });

  const injectFilters = useCallback(
    ({
      filters,
      query = { language: 'kuery', query: '' },
    }: {
      filters: Filter[];
      query?: Query;
    }): LensAttributes | null => {
      if (!attributes.current) {
        return null;
      }
      return {
        ...attributes.current,
        state: {
          ...attributes.current.state,
          query,
          filters: [...attributes.current.state.filters, ...filters],
        },
      };
    },
    [attributes]
  );

  const openInLensAction = useCallback(
    ({ timeRange, filters, query }: { timeRange: TimeRange; filters: Filter[]; query?: Query }) =>
      () => {
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
    [injectFilters, navigateToPrefilledEditor]
  );

  const getExtraActions = useCallback(
    ({ timeRange, filters, query }: { timeRange: TimeRange; filters: Filter[]; query?: Query }) => {
      const openInLens = getOpenInLensAction(openInLensAction({ timeRange, filters, query }));
      return [openInLens];
    },
    [openInLensAction]
  );

  const {
    formula: { formula },
  } = lensChartConfig;

  return { formula, attributes: attributes.current, getExtraActions, error };
};

const getOpenInLensAction = (onExecute: () => void): Action => {
  return {
    id: 'openInLens',

    getDisplayName(_context: ActionExecutionContext): string {
      return i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.actions.openInLines', {
        defaultMessage: 'Open in Lens',
      });
    },
    getIconType(_context: ActionExecutionContext): string | undefined {
      return 'visArea';
    },
    type: 'actionButton',
    async isCompatible(_context: ActionExecutionContext): Promise<boolean> {
      return true;
    },
    async execute(_context: ActionExecutionContext): Promise<void> {
      onExecute();
    },
    order: 100,
  };
};
