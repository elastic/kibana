/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PersistedIndexPatternLayer,
  FormulaPublicApi,
  XYState,
  FormBasedLayer,
} from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { ReferenceBasedIndexPatternColumn } from '@kbn/lens-plugin/public/datasources/form_based/operations/definitions/column_types';
import type { SavedObjectReference } from '@kbn/core-saved-objects-common';
import {
  DEFAULT_AD_HOC_DATA_VIEW_ID,
  DEFAULT_LAYER_ID,
  getAdhocDataView,
  getBreakdownColumn,
  getDefaultReferences,
  getHistogramColumn,
  getXYVisualizationState,
} from '../utils';
import type { LensOptions } from '../../../../types';
import type { ILensVisualization } from '../types';

const BREAKDOWN_COLUMN_NAME = 'hosts_aggs_breakdown';
const HISTOGRAM_COLUMN_NAME = 'x_date_histogram';
const REFERENCE_LAYER = 'referenceLayer';

export class Load implements ILensVisualization {
  constructor(
    private dataView: DataView,
    private options: LensOptions,
    private formula: FormulaPublicApi
  ) {}

  getTitle(): string {
    return 'Normalized Load';
  }

  getVisualizationType(): string {
    return 'lnsXY';
  }

  getLayers = (): Record<string, Omit<FormBasedLayer, 'indexPatternId'>> => {
    const baseLayer: PersistedIndexPatternLayer = {
      columnOrder: [BREAKDOWN_COLUMN_NAME, HISTOGRAM_COLUMN_NAME],
      columns: {
        ...getBreakdownColumn(BREAKDOWN_COLUMN_NAME, 'host.name', this.options.breakdownSize),
        ...getHistogramColumn(HISTOGRAM_COLUMN_NAME, this.dataView.timeFieldName ?? '@timestamp'),
      },
    };

    const dataLayer = this.formula.insertOrReplaceFormulaColumn(
      'y_cpu_cores_usage',
      {
        formula: 'average(system.load.1) / max(system.load.cores)',
        format: {
          id: 'percent',
          params: {
            decimals: 0,
          },
        },
      },
      baseLayer,
      this.dataView
    );

    if (!dataLayer) {
      throw new Error('Error generating the data layer for the chart');
    }

    return {
      [DEFAULT_LAYER_ID]: dataLayer,
      referenceLayer: {
        linkToLayers: [],
        columnOrder: ['referenceColumn'],
        columns: {
          referenceColumn: {
            label: 'Reference',
            dataType: 'number',
            operationType: 'static_value',
            isStaticValue: true,
            isBucketed: false,
            scale: 'ratio',
            params: {
              value: 1,
              format: {
                id: 'percent',
                params: {
                  decimals: 0,
                },
              },
            },
            references: [],
            customLabel: true,
          } as ReferenceBasedIndexPatternColumn,
        },
        sampling: 1,
        incompleteColumns: {},
      },
    };
  };
  getVisualizationState = (): XYState => {
    return getXYVisualizationState({
      layers: [
        {
          layerId: DEFAULT_LAYER_ID,
          seriesType: 'line',
          accessors: ['y_cpu_cores_usage'],
          yConfig: [],
          layerType: 'data',
          xAccessor: HISTOGRAM_COLUMN_NAME,
          splitAccessor: BREAKDOWN_COLUMN_NAME,
        },
        {
          layerId: REFERENCE_LAYER,
          layerType: 'referenceLine',
          accessors: ['referenceColumn'],
          yConfig: [
            {
              forAccessor: 'referenceColumn',
              axisMode: 'left',
              color: '#6092c0',
            },
          ],
        },
      ],
    });
  };

  getReferences = (): SavedObjectReference[] => [
    ...getDefaultReferences(this.dataView, DEFAULT_LAYER_ID),
    {
      type: 'index-pattern',
      id: this.dataView.id ?? DEFAULT_AD_HOC_DATA_VIEW_ID,
      name: `indexpattern-datasource-layer-${REFERENCE_LAYER}`,
    },
  ];
  getAdhocDataView = () => getAdhocDataView(this.dataView);
}
