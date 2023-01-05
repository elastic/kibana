/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import {
  CountIndexPatternColumn,
  TermsIndexPatternColumn,
  PersistedIndexPatternLayer,
  PieVisualizationState,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import type { Filter } from '@kbn/es-query';
import { APM_STATIC_DATA_VIEW_ID } from '../../../../../../common/data_view_constants';
import { MostUsedMetricTypes } from '.';

const BUCKET_SIZE = 5;

export function getLensAttributes({
  metric,
  filters,
  kuery = '',
}: {
  metric: MostUsedMetricTypes;
  filters: Filter[];
  kuery?: string;
}): TypedLensByValueInput['attributes'] {
  const metricId = metric.replaceAll('.', '-');

  const columnA = 'termsColumn';
  const columnB = 'countColumn';

  const dataLayer: PersistedIndexPatternLayer = {
    columnOrder: [columnA, columnB],
    columns: {
      [columnA]: {
        label: i18n.translate(
          'xpack.apm.serviceOverview.lensFlyout.topValues',
          {
            defaultMessage: 'Top {BUCKET_SIZE} values of {metric}',
            values: {
              BUCKET_SIZE,
              metric,
            },
          }
        ),
        dataType: 'string',
        operationType: 'terms',
        scale: 'ordinal',
        sourceField: metric,
        isBucketed: true,
        params: {
          size: BUCKET_SIZE,
          orderBy: {
            type: 'column',
            columnId: columnB,
          },
          orderDirection: 'desc',
        },
      } as TermsIndexPatternColumn,
      [columnB]: {
        label: i18n.translate(
          'xpack.apm.serviceOverview.lensFlyout.countRecords',
          {
            defaultMessage: 'Count of records',
          }
        ),
        dataType: 'number',
        operationType: 'count',
        scale: 'ratio',
        isBucketed: false,
        sourceField: '___records___',
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
        shape: 'donut',
        layers: [
          {
            layerId: metricId,
            primaryGroups: [columnA],
            metrics: [columnB],
            categoryDisplay: 'default',
            legendDisplay: 'hide',
            nestedLegend: false,
            numberDisplay: 'percent',
            layerType: 'data',
            legendPosition: 'bottom',
          },
        ],
      } as PieVisualizationState,
      datasourceStates: {
        formBased: {
          layers: {
            [metricId]: dataLayer,
          },
        },
      },
      filters,
      query: { language: 'kuery', query: kuery },
    },
  };
}
