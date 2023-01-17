/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Filter, FilterStateStore } from '@kbn/es-query';
import type {
  DateHistogramIndexPatternColumn,
  CounterRateIndexPatternColumn,
  MaxIndexPatternColumn,
  TermsIndexPatternColumn,
  PersistedIndexPatternLayer,
  XYState,
} from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SavedObjectReference } from '@kbn/core-saved-objects-common';
import type { LensVisualization, LensOptions } from '../../../../types';
import { DEFAULT_LAYER_ID, getXYVisualizationState } from '../utils';

export const diskIORead: LensVisualization = {
  getAttributes(dataView: DataView, options: LensOptions) {
    const getLayers = (): PersistedIndexPatternLayer => {
      return {
        columnOrder: [
          'hosts_aggs_breakdown',
          'x_date_histogram',
          'max_diskio_read',
          'y_diskio_read',
        ],
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
                type: 'custom',
              },
              orderAgg: {
                label: 'Last value of system.diskio.read.bytes',
                dataType: 'number',
                operationType: 'last_value',
                isBucketed: false,
                scale: 'ratio',
                sourceField: 'system.diskio.read.bytes',
                filter: {
                  query: 'system.diskio.read.bytes: *',
                  language: 'kuery',
                },
                params: {
                  sortField: '@timestamp',
                },
              },
              orderDirection: 'desc',
              otherBucket: true,
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
          y_diskio_read: {
            label: 'Counter rate of system.diskio.read.bytes per second',
            dataType: 'number',
            operationType: 'counter_rate',
            isBucketed: false,
            scale: 'ratio',
            references: ['max_diskio_read'],
            timeScale: 's',
            params: {
              format: {
                id: 'bytes',
                params: {
                  decimals: 1,
                },
              },
            },
            filter: {
              query: 'system.diskio.read.bytes >= 0',
              language: 'kuery',
            },
          } as CounterRateIndexPatternColumn,
          max_diskio_read: {
            label: 'Maximum of system.diskio.read.bytes',
            dataType: 'number',
            operationType: 'max',
            sourceField: 'system.diskio.read.bytes',
            isBucketed: false,
            scale: 'ratio',
            params: {
              emptyAsNull: true,
            },
          } as MaxIndexPatternColumn,
        },
      };
    };
    const getVisualizationState = (): XYState => {
      return getXYVisualizationState({
        layers: [
          {
            layerId: DEFAULT_LAYER_ID,
            seriesType: 'line',
            accessors: ['y_diskio_read'],
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
            key: 'system.diskio.read.bytes',
            value: 'exists',
            type: 'exists',
          },
          query: {
            exists: {
              field: 'system.diskio.read.bytes',
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
      title: 'Disk Read IOPS',
      visualizationType: 'lnsXY',
      getReferences,
      getLayers,
      getVisualizationState,
      getFilters,
    };
  },
};
