/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Filter, FilterStateStore } from '@kbn/es-query';
import type {
  CounterRateIndexPatternColumn,
  FormBasedLayer,
  MaxIndexPatternColumn,
  XYState,
} from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SavedObjectReference } from '@kbn/core-saved-objects-common';
import type { LensOptions } from '../../../../types';
import {
  DEFAULT_LAYER_ID,
  getBreakdownColumn,
  getHistogramColumn,
  getXYVisualizationState,
} from '../utils';
import { ILensVisualization } from '../types';

const BREAKDOWN_COLUMN_NAME = 'hosts_aggs_breakdown';
const HISTOGRAM_COLUMN_NAME = 'x_date_histogram';

export class DiskIOWrite implements ILensVisualization {
  constructor(private dataView: DataView, private options: LensOptions) {}

  getTitle(): string {
    return 'Disk Write IOPS';
  }

  getVisualizationType(): string {
    return 'lnsXY';
  }

  getLayers = (): Record<string, Omit<FormBasedLayer, 'indexPatternId'>> => {
    return {
      [DEFAULT_LAYER_ID]: {
        columnOrder: [
          BREAKDOWN_COLUMN_NAME,
          HISTOGRAM_COLUMN_NAME,
          'max_diskio_write',
          'y_diskio_write',
        ],
        columns: {
          ...getBreakdownColumn(BREAKDOWN_COLUMN_NAME, 'host.name', this.options.breakdownSize),
          ...getHistogramColumn(HISTOGRAM_COLUMN_NAME, this.dataView.timeFieldName ?? '@timestamp'),
          y_diskio_write: {
            label: 'Counter rate of system.diskio.write.bytes per second',
            dataType: 'number',
            operationType: 'counter_rate',
            isBucketed: false,
            scale: 'ratio',
            references: ['max_diskio_write'],
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
              query: 'system.diskio.write.bytes >= 0',
              language: 'kuery',
            },
          } as CounterRateIndexPatternColumn,
          max_diskio_write: {
            label: 'Maximum of system.diskio.write.bytes',
            dataType: 'number',
            operationType: 'max',
            sourceField: 'system.diskio.write.bytes',
            isBucketed: false,
            scale: 'ratio',
            params: {
              emptyAsNull: true,
            },
          } as MaxIndexPatternColumn,
        },
      },
    };
  };
  getVisualizationState = (): XYState => {
    return getXYVisualizationState({
      layers: [
        {
          layerId: DEFAULT_LAYER_ID,
          seriesType: 'line',
          accessors: ['y_diskio_write'],
          yConfig: [],
          layerType: 'data',
          xAccessor: HISTOGRAM_COLUMN_NAME,
          splitAccessor: BREAKDOWN_COLUMN_NAME,
        },
      ],
    });
  };
  getFilters = (): Filter[] => {
    return [
      {
        meta: {
          disabled: false,
          negate: false,
          alias: null,
          index: '3be1e71b-4bc5-4462-a314-04539f877a19',
          key: 'system.diskio.write.bytes',
          value: 'exists',
          type: 'exists',
        },
        query: {
          exists: {
            field: 'system.diskio.write.bytes',
          },
        },
        $state: {
          store: FilterStateStore.APP_STATE,
        },
      },
    ];
  };

  getReferences = (): SavedObjectReference[] => {
    return [
      {
        type: 'index-pattern',
        id: this.dataView.id ?? '',
        name: `indexpattern-datasource-layer-${DEFAULT_LAYER_ID}`,
      },
    ];
  };
}
