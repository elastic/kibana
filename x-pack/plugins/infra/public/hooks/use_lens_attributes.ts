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
import { FormulaPublicApi, LayerType as LensLayerType } from '@kbn/lens-plugin/public';
import { InfraClientSetupDeps } from '../types';
import {
  type XYLayerOptions,
  type MetricLayerOptions,
  type FormulaConfig,
  type LensAttributes,
  type XYVisualOptions,
  type Chart,
  LensAttributesBuilder,
  XYDataLayer,
  MetricLayer,
  XYChart,
  MetricChart,
  XYReferenceLinesLayer,
  LensVisualizationState,
} from '../common/visualizations';
import { useLazyRef } from './use_lazy_ref';

type LayerOptions = XYLayerOptions | MetricLayerOptions;
type ChartType = 'lnsXY' | 'lnsMetric';
type VisualOptions = XYVisualOptions;
export type LayerType = Exclude<LensLayerType, 'annotations' | 'metricTrendline'>;

export interface Layer<
  TLayerOptions extends LayerOptions,
  TFormulaConfig extends FormulaConfig | FormulaConfig[],
  TLayerType extends LayerType = LayerType
> {
  layerType: TLayerType;
  data: TFormulaConfig;
  options?: TLayerOptions;
}

interface UseLensAttributesBaseParams<
  TOptions extends LayerOptions,
  TLayers extends Array<Layer<TOptions, FormulaConfig[]>> | Layer<TOptions, FormulaConfig>
> {
  dataView?: DataView;
  layers: TLayers;
  title?: string;
}

interface UseLensAttributesXYChartParams
  extends UseLensAttributesBaseParams<
    XYLayerOptions,
    Array<Layer<XYLayerOptions, FormulaConfig[], 'data' | 'referenceLine'>>
  > {
  visualizationType: 'lnsXY';
  visualOptions?: XYVisualOptions;
}

interface UseLensAttributesMetricChartParams
  extends UseLensAttributesBaseParams<
    MetricLayerOptions,
    Layer<MetricLayerOptions, FormulaConfig, 'data'>
  > {
  visualizationType: 'lnsMetric';
}

export type UseLensAttributesParams =
  | UseLensAttributesXYChartParams
  | UseLensAttributesMetricChartParams;

export const useLensAttributes = ({
  dataView,
  layers,
  title,
  visualizationType,
  ...extraParams
}: UseLensAttributesParams) => {
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
        layers,
        title,
        visualizationType,
        ...extraParams,
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
    const firstDataLayer = [...(Array.isArray(layers) ? layers : [layers])].find(
      (p) => p.layerType === 'data'
    );

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

const chartFactory = <
  TOptions,
  TLayers extends Array<Layer<TOptions, FormulaConfig[]>> | Layer<TOptions, FormulaConfig>
>({
  dataView,
  formulaAPI,
  layers,
  title,
  visualizationType,
  visualOptions,
}: {
  dataView: DataView;
  formulaAPI: FormulaPublicApi;
  visualizationType: ChartType;
  layers: TLayers;
  title?: string;
  visualOptions?: VisualOptions;
}): Chart<LensVisualizationState> => {
  switch (visualizationType) {
    case 'lnsXY':
      if (!Array.isArray(layers)) {
        throw new Error(`Invalid layers type. Expected an array of layers.`);
      }

      const getLayerClass = (layerType: LayerType) => {
        switch (layerType) {
          case 'data': {
            return XYDataLayer;
          }
          case 'referenceLine': {
            return XYReferenceLinesLayer;
          }
          default:
            throw new Error(`Invalid layerType: ${layerType}`);
        }
      };

      return new XYChart({
        dataView,
        layers: layers.map((layerItem) => {
          const Layer = getLayerClass(layerItem.layerType);
          return new Layer({
            data: layerItem.data,
            formulaAPI,
            options: layerItem.options,
          });
        }),
        title,
        visualOptions,
      });

    case 'lnsMetric':
      if (Array.isArray(layers)) {
        throw new Error(`Invalid layers type. Expected a single layer object.`);
      }

      return new MetricChart({
        dataView,
        layers: new MetricLayer({
          data: layers.data,
          formulaAPI,
          options: layers.options,
        }),
        title,
      });
    default:
      throw new Error(`Unsupported chart type: ${visualizationType}`);
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
