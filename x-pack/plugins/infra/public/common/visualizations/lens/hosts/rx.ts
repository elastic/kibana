/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Filter, FilterStateStore } from '@kbn/es-query';
import type {
  DateHistogramIndexPatternColumn,
  FormulaPublicApi,
  PersistedIndexPatternLayer,
  TermsIndexPatternColumn,
  XYState,
} from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SavedObjectReference } from '@kbn/core-saved-objects-common';
import { DEFAULT_LAYER_ID, getXYVisualizationState } from '../utils';
import type { LensVisualization, LensOptions } from '../../../../types';

export const rx: LensVisualization = {
  getAttributes(dataView: DataView, options: LensOptions, formula?: FormulaPublicApi) {
    const getLayers = (): PersistedIndexPatternLayer => {
      const baseLayer = {
        columnOrder: ['hosts_aggs_breakdown', 'x_date_histogram'],
        columns: {
          hosts_aggs_breakdown: {
            label: `Top ${options.breakdownSize} values of host.name`,
            dataType: 'string',
            operationType: 'terms',
            scale: 'ordinal',
            sourceField: 'host.name',
            isBucketed: true,
            params: {
              size: options.breakdownSize,
              orderBy: {
                type: 'alphabetical',
                fallback: false,
              },
              orderDirection: 'desc',
              otherBucket: false,
              missingBucket: false,
              parentFormat: {
                id: 'terms',
              },
              include: [],
              exclude: [],
              includeIsRegex: false,
              excludeIsRegex: false,
            },
          } as TermsIndexPatternColumn,
          x_date_histogram: {
            dataType: 'date',
            isBucketed: true,
            label: '@timestamp',
            operationType: 'date_histogram',
            params: { interval: 'auto' },
            scale: 'interval',
            sourceField: dataView.timeFieldName,
          } as DateHistogramIndexPatternColumn,
        },
      };

      if (!formula) {
        throw new Error('no formula');
      }

      const dataLayer = formula.insertOrReplaceFormulaColumn(
        'y_network_in_bytes',
        {
          formula:
            "counter_rate(max(system.network.in.bytes), kql='system.network.in.bytes: *') * 8",
          timeScale: 's',
          format: {
            id: 'bits',
            params: {
              decimals: 1,
            },
          },
        },
        baseLayer,
        dataView
      );

      if (!dataLayer) {
        throw new Error('no dataLayer');
      }

      return dataLayer;
    };
    const getVisualizationState = (): XYState => {
      return getXYVisualizationState({
        layers: [
          {
            layerId: DEFAULT_LAYER_ID,
            seriesType: 'line',
            accessors: ['y_network_in_bytes'],
            yConfig: [],
            layerType: 'data',
            xAccessor: 'x_date_histogram',
            splitAccessor: 'hosts_aggs_breakdown',
          },
        ],
      });
    };
    const getFilters = (): Filter[] => {
      return [
        {
          meta: {
            disabled: false,
            negate: false,
            alias: null,
            index: '3be1e71b-4bc5-4462-a314-04539f877a19',
            key: 'system.network.in.bytes',
            value: 'exists',
            type: 'exists',
          },
          query: {
            exists: {
              field: 'system.network.in.bytes',
            },
          },
          $state: {
            store: FilterStateStore.APP_STATE,
          },
        },
      ];
    };

    const getReferences = (): SavedObjectReference[] => {
      return [
        {
          type: 'index-pattern',
          id: dataView.id ?? '',
          name: `indexpattern-datasource-layer-${DEFAULT_LAYER_ID}`,
        },
      ];
    };

    return {
      title: 'Network Inbound (RX)',
      visualizationType: 'lnsXY',
      getReferences,
      getLayers,
      getVisualizationState,
      getFilters,
    };
  },
};
