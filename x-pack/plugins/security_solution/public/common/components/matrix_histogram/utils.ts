/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScaleType, Position } from '@elastic/charts';
import { get, groupBy, map, toPairs } from 'lodash/fp';

import { Filter } from '@kbn/es-query';
import { UpdateDateRange, ChartSeriesData } from '../charts/common';
import { MatrixHistogramMappingTypes, BarchartConfigs, LensAttributes } from './types';
import { MatrixHistogramData } from '../../../../common/search_strategy';
import { histogramDateTimeFormatter } from '../utils';
import { HttpSetup } from '../../../../../../../src/core/public';
import { Case } from '../../../../../cases/common';

interface GetBarchartConfigsProps {
  chartHeight?: number;
  from: string;
  legendPosition?: Position;
  to: string;
  onBrushEnd: UpdateDateRange;
  yTickFormatter?: (value: number) => string;
  showLegend?: boolean;
}

export const DEFAULT_CHART_HEIGHT = 174;
export const DEFAULT_Y_TICK_FORMATTER = (value: string | number): string => value.toLocaleString();

export const getBarchartConfigs = ({
  chartHeight,
  from,
  legendPosition,
  to,
  onBrushEnd,
  yTickFormatter,
  showLegend,
}: GetBarchartConfigsProps): BarchartConfigs => ({
  series: {
    xScaleType: ScaleType.Time,
    yScaleType: ScaleType.Linear,
    stackAccessors: ['g'],
  },
  axis: {
    xTickFormatter: histogramDateTimeFormatter([from, to]),
    yTickFormatter: yTickFormatter != null ? yTickFormatter : DEFAULT_Y_TICK_FORMATTER,
    tickSize: 8,
  },
  settings: {
    legendPosition: legendPosition ?? Position.Right,
    onBrushEnd,
    showLegend: showLegend ?? true,
    showLegendExtra: true,
    theme: {
      scales: {
        barsPadding: 0.08,
      },
      chartMargins: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
      chartPaddings: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
    },
  },
  customHeight: chartHeight ?? DEFAULT_CHART_HEIGHT,
});

export const defaultLegendColors = [
  '#1EA593',
  '#2B70F7',
  '#CE0060',
  '#38007E',
  '#FCA5D3',
  '#F37020',
  '#E49E29',
  '#B0916F',
  '#7B000B',
  '#34130C',
  '#GGGGGG',
];

export const formatToChartDataItem = ([key, value]: [
  string,
  MatrixHistogramData[]
]): ChartSeriesData => ({
  key,
  value,
});

export const getCustomChartData = (
  data: MatrixHistogramData[] | null,
  mapping?: MatrixHistogramMappingTypes
): ChartSeriesData[] => {
  if (!data) return [];
  const dataGroupedByEvent = groupBy('g', data);
  const dataGroupedEntries = toPairs(dataGroupedByEvent);
  const formattedChartData = map(formatToChartDataItem, dataGroupedEntries);
  return formattedChartData.map((item: ChartSeriesData, idx: number) => {
    const mapItem = get(item.key, mapping);
    return { ...item, color: mapItem?.color ?? defaultLegendColors[idx] };
  });
};

export const getHostDetailsPageFilter = (hostName?: string): Filter[] =>
  hostName
    ? [
        {
          meta: {
            index: 'e5bb994d-e8fb-4ddb-a36e-730ad8cc0712',
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: 'host.name',
            params: {
              query: hostName,
            },
          },
          query: {
            match_phrase: {
              'host.name': hostName,
            },
          },
        },
      ]
    : [];

export const filterHostExternalAlertData: Filter[] = [
  {
    query: {
      bool: {
        filter: [
          {
            bool: {
              should: [
                {
                  exists: {
                    field: 'host.name',
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    },
    meta: {
      alias: '',
      disabled: false,
      key: 'bool',
      negate: false,
      type: 'custom',
      value:
        '{"query": {"bool": {"filter": [{"bool": {"should": [{"exists": {"field": "host.name"}}],"minimum_should_match": 1}}]}}}',
    },
  },
];

export const filterNetworkExternalAlertData: Filter[] = [
  {
    query: {
      bool: {
        filter: [
          {
            bool: {
              should: [
                {
                  bool: {
                    should: [
                      {
                        exists: {
                          field: 'source.ip',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
                {
                  bool: {
                    should: [
                      {
                        exists: {
                          field: 'destination.ip',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    },
    meta: {
      alias: '',
      disabled: false,
      key: 'bool',
      negate: false,
      type: 'custom',
      value:
        '{"bool":{"filter":[{"bool":{"should":[{"bool":{"should":[{"exists":{"field": "source.ip"}}],"minimum_should_match":1}},{"bool":{"should":[{"exists":{"field": "destination.ip"}}],"minimum_should_match":1}}],"minimum_should_match":1}}]}}',
    },
  },
];

export const addToCase = async (
  http: HttpSetup,
  theCase: Case,
  attributes: LensAttributes,
  timeRange?: { from: string; to: string },
  owner?: string
) => {
  const apiPath = `/api/cases/${theCase?.id}/comments`;

  const vizPayload = {
    attributes,
    timeRange,
  };

  const payload = {
    comment: `!{lens${JSON.stringify(vizPayload)}}`,
    type: 'user',
    owner: owner ?? 'security_solution',
  };

  return http.post(apiPath, { body: JSON.stringify(payload) });
};
