/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { BehaviorSubject } from 'rxjs';

import { useObservable } from 'react-use';

import { euiPaletteColorBlind, EuiDataGridColumn } from '@elastic/eui';

import { KBN_FIELD_TYPES } from '../../../../../../../src/plugins/data/public';

import { NON_AGGREGATABLE } from './common';

export const hoveredRow$ = new BehaviorSubject<any | null>(null);

const BAR_COLOR = euiPaletteColorBlind()[0];
const BAR_COLOR_BLUR = euiPaletteColorBlind(2)[10];
const MAX_CHART_COLUMNS = 20;

const getXScaleType = (
  kbnFieldType: KBN_FIELD_TYPES
): 'ordinal' | 'time' | 'linear' | undefined => {
  switch (kbnFieldType) {
    case KBN_FIELD_TYPES.BOOLEAN:
    case KBN_FIELD_TYPES.IP:
    case KBN_FIELD_TYPES.STRING:
      return 'ordinal';
    case KBN_FIELD_TYPES.DATE:
      return 'time';
    case KBN_FIELD_TYPES.NUMBER:
      return 'linear';
  }
};

const getFieldType = (schema: EuiDataGridColumn['schema']): KBN_FIELD_TYPES | undefined => {
  if (schema === NON_AGGREGATABLE) {
    return undefined;
  }

  let fieldType: KBN_FIELD_TYPES;

  switch (schema) {
    case 'datetime':
      fieldType = KBN_FIELD_TYPES.DATE;
      break;
    case 'numeric':
      fieldType = KBN_FIELD_TYPES.NUMBER;
      break;
    case 'boolean':
      fieldType = KBN_FIELD_TYPES.BOOLEAN;
      break;
    case 'json':
      fieldType = KBN_FIELD_TYPES.OBJECT;
      break;
    default:
      fieldType = KBN_FIELD_TYPES.STRING;
  }

  return fieldType;
};

export const fetchChartData = async (
  indexPatternTitle: string,
  api: any,
  query: any,
  columnType: EuiDataGridColumn
): Promise<ChartData> => {
  const fieldType = getFieldType(columnType.schema);

  const fetchCardinality = async () => {
    try {
      const resp: any = await api.esSearch({
        index: indexPatternTitle,
        size: 0,
        body: {
          query,
          aggs: {
            categories: {
              cardinality: {
                field: columnType.id,
              },
            },
          },
          size: 0,
        },
      });
      return resp.aggregations.categories.value;
    } catch (e) {
      throw new Error(e);
    }
  };

  const fetchChartHistogramData = async () => {
    try {
      const respStats: any = await api.esSearch({
        index: indexPatternTitle,
        size: 0,
        body: {
          query,
          aggs: {
            min_max: {
              stats: {
                field: columnType.id,
              },
            },
          },
          size: 0,
        },
      });

      const stats = [respStats.aggregations.min_max.min, respStats.aggregations.min_max.max];
      if (stats.includes(null)) {
        return {
          data: [],
          interval: 0,
          stats: [0, 0],
        };
      }

      const delta = respStats.aggregations.min_max.max - respStats.aggregations.min_max.min;

      let aggInterval = 1;

      if (delta > MAX_CHART_COLUMNS) {
        aggInterval = Math.round(delta / MAX_CHART_COLUMNS);
      }

      if (delta <= 1) {
        aggInterval = delta / MAX_CHART_COLUMNS;
      }

      const resp: any = await api.esSearch({
        index: indexPatternTitle,
        size: 0,
        body: {
          query,
          aggs: {
            chart: {
              histogram: {
                field: columnType.id,
                interval: aggInterval,
              },
            },
          },
          size: 0,
        },
      });

      return {
        data: resp.aggregations.chart.buckets,
        interval: aggInterval,
        stats,
      };
    } catch (e) {
      throw new Error(e);
    }
  };

  const fetchChartTermsData = async () => {
    try {
      const resp: any = await api.esSearch({
        index: indexPatternTitle,
        size: 0,
        body: {
          query,
          aggs: {
            chart: {
              terms: {
                field: columnType.id,
                size: MAX_CHART_COLUMNS,
              },
            },
          },
          size: 0,
        },
      });
      return resp.aggregations.chart.buckets;
    } catch (e) {
      throw new Error(e);
    }
  };

  if (fieldType === KBN_FIELD_TYPES.NUMBER || fieldType === KBN_FIELD_TYPES.DATE) {
    return {
      ...((await fetchChartHistogramData()) as NumericChartData),
      id: columnType.id,
    };
  } else if (fieldType === KBN_FIELD_TYPES.STRING || fieldType === KBN_FIELD_TYPES.BOOLEAN) {
    // TODO query in parallel
    return {
      cardinality: await fetchCardinality(),
      data: await fetchChartTermsData(),
      id: columnType.id,
    } as OrdinalChartData;
  } else if (fieldType === KBN_FIELD_TYPES.OBJECT || fieldType === undefined) {
    return {
      cardinality: 0,
      data: [],
      id: columnType.id,
    };
  }

  throw new Error('Invalid fieldType');
};

interface NumericDataItem {
  key: number;
  key_as_string?: string;
  doc_count: number;
}

interface NumericChartData {
  data: NumericDataItem[];
  id: string;
  interval: number;
  stats: [number, number];
}

export const isNumericChartData = (arg: any): arg is NumericChartData => {
  return (
    arg.hasOwnProperty('data') &&
    arg.hasOwnProperty('id') &&
    arg.hasOwnProperty('interval') &&
    arg.hasOwnProperty('stats')
  );
};

interface OrdinalDataItem {
  key: string;
  doc_count: number;
}

interface OrdinalChartData {
  cardinality: number;
  data: OrdinalDataItem[];
  id: string;
}

export const isOrdinalChartData = (arg: any): arg is OrdinalChartData => {
  return (
    arg.hasOwnProperty('data') && arg.hasOwnProperty('cardinality') && arg.hasOwnProperty('id')
  );
};

type ChartDataItem = NumericDataItem | OrdinalDataItem;
export type ChartData = NumericChartData | OrdinalChartData;

export const useColumnChart = (chartData: ChartData, columnType: EuiDataGridColumn) => {
  const fieldType = getFieldType(columnType.schema);

  const hoveredRow = useObservable(hoveredRow$);

  if (fieldType === undefined) {
    throw new Error('Invalid fieldType');
  }

  const xScaleType = getXScaleType(fieldType);

  const getColor = (d: ChartDataItem) => {
    if (hoveredRow === undefined || hoveredRow === null) {
      return BAR_COLOR;
    }

    if (
      isOrdinalChartData(chartData) &&
      xScaleType === 'ordinal' &&
      hoveredRow._source[columnType.id] === d.key
    ) {
      return BAR_COLOR;
    }

    if (
      isNumericChartData(chartData) &&
      xScaleType === 'linear' &&
      hoveredRow._source[columnType.id] >= +d.key &&
      hoveredRow._source[columnType.id] < +d.key + chartData.interval
    ) {
      return BAR_COLOR;
    }

    if (
      isNumericChartData(chartData) &&
      xScaleType === 'time' &&
      moment(hoveredRow._source[columnType.id]).unix() * 1000 >= +d.key &&
      moment(hoveredRow._source[columnType.id]).unix() * 1000 < +d.key + chartData.interval
    ) {
      return BAR_COLOR;
    }

    return BAR_COLOR_BLUR;
  };

  // The if/else if/else is a work-around because `.map()` doesn't work with union types.
  // See TS Caveats for details: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-3.html#caveats
  if (isOrdinalChartData(chartData)) {
    const coloredData = chartData.data.map((d: ChartDataItem) => ({ ...d, color: getColor(d) }));
    return {
      cardinality: chartData.cardinality,
      coloredData,
      fieldType,
      xScaleType,
      MAX_CHART_COLUMNS,
    };
  } else if (isNumericChartData(chartData)) {
    const coloredData = chartData.data.map((d: ChartDataItem) => ({ ...d, color: getColor(d) }));
    return {
      coloredData,
      fieldType,
      stats: chartData.stats,
      xScaleType,
      MAX_CHART_COLUMNS,
    };
  } else {
    throw new Error('invalid chart data.');
  }
};
