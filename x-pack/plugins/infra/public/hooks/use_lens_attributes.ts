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
import { FormulaPublicApi } from '@kbn/lens-plugin/public';
import {
  type XYLayerOptions,
  type MetricLayerOptions,
  type FormulaValueConfig,
  type LensAttributes,
  type StaticValueConfig,
  type LensVisualizationState,
  type XYVisualOptions,
  type Chart,
  LensAttributesBuilder,
  XYDataLayer,
  MetricLayer,
  XYChart,
  MetricChart,
  XYReferenceLinesLayer,
} from '@kbn/lens-embeddable-utils';

import { InfraClientSetupDeps } from '../types';
import { useLazyRef } from './use_lazy_ref';

type Options = XYLayerOptions | MetricLayerOptions;

interface StaticValueLayer {
  data: StaticValueConfig[];
  layerType: 'referenceLine';
}

interface FormulaValueLayer<
  TOptions extends Options,
  TData extends FormulaValueConfig[] | FormulaValueConfig
> {
  options?: TOptions;
  data: TData;
  layerType: 'data';
}

type XYLayerConfig = StaticValueLayer | FormulaValueLayer<XYLayerOptions, FormulaValueConfig[]>;

export type UseLensAttributesXYLayerConfig = XYLayerConfig | XYLayerConfig[];
export type UseLensAttributesMetricLayerConfig = FormulaValueLayer<
  MetricLayerOptions,
  FormulaValueConfig
>;

interface UseLensAttributesBaseParams {
  dataView?: DataView;
  title?: string;
}

interface UseLensAttributesXYChartParams extends UseLensAttributesBaseParams {
  layers: UseLensAttributesXYLayerConfig;
  visualizationType: 'lnsXY';
  visualOptions?: XYVisualOptions;
}

interface UseLensAttributesMetricChartParams extends UseLensAttributesBaseParams {
  layers: UseLensAttributesMetricLayerConfig;
  visualizationType: 'lnsMetric';
}

export type UseLensAttributesParams =
  | UseLensAttributesXYChartParams
  | UseLensAttributesMetricChartParams;

export const useLensAttributes = ({ dataView, ...params }: UseLensAttributesParams) => {
  const {
    services: { lens },
  } = useKibana<InfraClientSetupDeps>();
  const { navigateToPrefilledEditor } = lens;
  const { value, error } = useAsync(lens.stateHelperApi, [lens]);
  const { formula: formulaAPI } = value ?? {};

  const attributes = useLazyRef(() => {
    if (!dataView || !formulaAPI) {
      return null;
    }

    const builder = new LensAttributesBuilder({
      visualization: chartFactory({
        dataView,
        formulaAPI,
        ...params,
      }),
    });

    return builder.build();
  });

  const injectFilters = useCallback(
    ({ filters, query }: { filters: Filter[]; query: Query }): LensAttributes | null => {
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
    ({ timeRange, query, filters }: { timeRange: TimeRange; filters: Filter[]; query: Query }) =>
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
    ({
      timeRange,
      filters = [],
      query = { language: 'kuery', query: '' },
    }: {
      timeRange: TimeRange;
      filters?: Filter[];
      query?: Query;
    }) => {
      const openInLens = getOpenInLensAction(openInLensAction({ timeRange, filters, query }));
      return [openInLens];
    },
    [openInLensAction]
  );

  const getFormula = () => {
    const firstDataLayer = [
      ...(Array.isArray(params.layers) ? params.layers : [params.layers]),
    ].find((p) => p.layerType === 'data');

    if (!firstDataLayer) {
      return '';
    }

    const mainFormulaConfig = Array.isArray(firstDataLayer.data)
      ? firstDataLayer.data[0]
      : firstDataLayer.data;

    return mainFormulaConfig.value;
  };

  return { formula: getFormula(), attributes: attributes.current, getExtraActions, error };
};

const chartFactory = ({
  dataView,
  formulaAPI,
  ...params
}: {
  dataView: DataView;
  formulaAPI: FormulaPublicApi;
} & UseLensAttributesParams): Chart<LensVisualizationState> => {
  switch (params.visualizationType) {
    case 'lnsXY':
      if (!Array.isArray(params.layers)) {
        throw new Error(`Invalid layers type. Expected an array of layers.`);
      }

      const xyLayerFactory = (layer: XYLayerConfig) => {
        switch (layer.layerType) {
          case 'data': {
            return new XYDataLayer({
              data: layer.data,
              options: layer.options,
            });
          }
          case 'referenceLine': {
            return new XYReferenceLinesLayer({
              data: layer.data,
            });
          }
          default:
            throw new Error(`Invalid layerType`);
        }
      };

      return new XYChart({
        dataView,
        formulaAPI,
        layers: params.layers.map((layerItem) => {
          return xyLayerFactory(layerItem);
        }),
        title: params.title,
        visualOptions: params.visualOptions,
      });

    case 'lnsMetric':
      if (Array.isArray(params.layers)) {
        throw new Error(`Invalid layers type. Expected a single layer object.`);
      }

      return new MetricChart({
        dataView,
        formulaAPI,
        layers: new MetricLayer({
          data: params.layers.data,
          options: params.layers.options,
        }),
        title: params.title,
      });
    default:
      throw new Error(`Unsupported chart type`);
  }
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
