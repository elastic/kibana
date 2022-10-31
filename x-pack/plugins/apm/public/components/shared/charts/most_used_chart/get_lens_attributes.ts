/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CountIndexPatternColumn,
  TermsIndexPatternColumn,
  PersistedIndexPatternLayer,
  PieVisualizationState,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { APM_STATIC_DATA_VIEW_ID } from '../../../../../common/data_view_constants';
import { MostUsedMetric } from './';

export function getLensAttributes({
  metric,
  bucketSize,
  filters,
}: {
  metric: MostUsedMetric;
  bucketSize: number;
  filters: QueryDslQueryContainer[];
}): TypedLensByValueInput['attributes'] {
  const metricId = metric.replaceAll('.', '-');
  const dataLayer: PersistedIndexPatternLayer = {
    incompleteColumns: {},
    sampling: 1,
    columnOrder: ['termsColumn', 'countColumn'],
    columns: {
      termsColumn: {
        label: `Top ${bucketSize} values of ${metric}`,
        dataType: 'string',
        operationType: 'terms',
        scale: 'ordinal',
        sourceField: metric,
        isBucketed: true,
        params: {
          size: bucketSize,
          orderBy: {
            type: 'column',
            columnId: 'countColumn',
          },
          orderDirection: 'desc',
          otherBucket: true,
          parentFormat: {
            id: 'terms',
          },
        },
      } as TermsIndexPatternColumn,
      countColumn: {
        label: 'Count of records',
        dataType: 'number',
        operationType: 'count',
        isBucketed: false,
        scale: 'ratio',
        sourceField: '___records___',
        params: {
          emptyAsNull: true,
        },
      } as CountIndexPatternColumn,
    },
  };

  return {
    title: `most-used-${metricId}`,
    visualizationType: 'lnsPie',
    references: [
      {
        type: 'index-pattern',
        id: APM_STATIC_DATA_VIEW_ID,
        name: `indexpattern-datasource-layer-${metricId}`,
      },
    ],
    state: {
      visualization: {
        shape: 'pie',
        layers: [
          {
            layerId: metricId,
            primaryGroups: ['termsColumn'],
            metric: 'countColumn',
            categoryDisplay: 'default',
            legendDisplay: 'hide',
            numberDisplay: 'percent',
            showValuesInLegend: true,
            nestedLegend: false,
            layerType: 'data',
          },
        ],
      } as PieVisualizationState,
      internalReferences: [],
      adHocDataViews: {},
      datasourceStates: {
        formBased: {
          layers: {
            [metricId]: dataLayer,
          },
        },
      },
      filters: [
        {
          meta: {},
          query: {
            bool: {
              filter: [...filters],
            },
          },
        },
      ],
      query: { language: 'kuery', query: '' },
    },
  };
}
