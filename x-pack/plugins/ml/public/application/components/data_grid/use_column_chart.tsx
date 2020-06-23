/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { BehaviorSubject } from 'rxjs';
import React from 'react';

import { useObservable } from 'react-use';

import { euiPaletteColorBlind, EuiDataGridColumn } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { KBN_FIELD_TYPES } from '../../../../../../../src/plugins/data/public';

import { stringHash } from '../../../../common/util/string_utils';

import { NON_AGGREGATABLE } from './common';

export const hoveredRow$ = new BehaviorSubject<any | null>(null);

const BAR_COLOR = euiPaletteColorBlind()[0];
const BAR_COLOR_BLUR = euiPaletteColorBlind({ rotations: 2 })[10];
const MAX_CHART_COLUMNS = 20;

type XScaleType = 'ordinal' | 'time' | 'linear' | undefined;
const getXScaleType = (kbnFieldType: KBN_FIELD_TYPES | undefined): XScaleType => {
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

interface NumericColumnStats {
  interval: number;
  min: number;
  max: number;
}
type NumericColumnStatsMap = Record<string, NumericColumnStats>;
const getAggIntervals = async (
  indexPatternTitle: string,
  esSearch: (payload: any) => Promise<any>,
  query: any,
  columnTypes: EuiDataGridColumn[]
): Promise<NumericColumnStatsMap> => {
  const numericColumns = columnTypes.filter((cT) => {
    const fieldType = getFieldType(cT.schema);
    return fieldType === KBN_FIELD_TYPES.NUMBER || fieldType === KBN_FIELD_TYPES.DATE;
  });

  if (numericColumns.length === 0) {
    return {};
  }

  const minMaxAggs = numericColumns.reduce((aggs, c) => {
    const id = stringHash(c.id);
    aggs[id] = {
      stats: {
        field: c.id,
      },
    };
    return aggs;
  }, {} as Record<string, object>);

  const respStats = await esSearch({
    index: indexPatternTitle,
    size: 0,
    body: {
      query,
      aggs: minMaxAggs,
      size: 0,
    },
  });

  return Object.keys(respStats.aggregations).reduce((p, aggName) => {
    const stats = [respStats.aggregations[aggName].min, respStats.aggregations[aggName].max];
    if (!stats.includes(null)) {
      const delta = respStats.aggregations[aggName].max - respStats.aggregations[aggName].min;

      let aggInterval = 1;

      if (delta > MAX_CHART_COLUMNS) {
        aggInterval = Math.round(delta / MAX_CHART_COLUMNS);
      }

      if (delta <= 1) {
        aggInterval = delta / MAX_CHART_COLUMNS;
      }

      p[aggName] = { interval: aggInterval, min: stats[0], max: stats[1] };
    }

    return p;
  }, {} as NumericColumnStatsMap);
};

interface AggHistogram {
  histogram: {
    field: string;
    interval: number;
  };
}

interface AggCardinality {
  cardinality: {
    field: string;
  };
}

interface AggTerms {
  terms: {
    field: string;
    size: number;
  };
}

type ChartRequestAgg = AggHistogram | AggCardinality | AggTerms;

export const fetchChartsData = async (
  indexPatternTitle: string,
  esSearch: (payload: any) => Promise<any>,
  query: any,
  columnTypes: EuiDataGridColumn[]
): Promise<ChartData[]> => {
  const aggIntervals = await getAggIntervals(indexPatternTitle, esSearch, query, columnTypes);

  const chartDataAggs = columnTypes.reduce((aggs, c) => {
    const fieldType = getFieldType(c.schema);
    const id = stringHash(c.id);
    if (fieldType === KBN_FIELD_TYPES.NUMBER || fieldType === KBN_FIELD_TYPES.DATE) {
      if (aggIntervals[id] !== undefined) {
        aggs[`${id}_histogram`] = {
          histogram: {
            field: c.id,
            interval: aggIntervals[id].interval !== 0 ? aggIntervals[id].interval : 1,
          },
        };
      }
    } else if (fieldType === KBN_FIELD_TYPES.STRING || fieldType === KBN_FIELD_TYPES.BOOLEAN) {
      if (fieldType === KBN_FIELD_TYPES.STRING) {
        aggs[`${id}_cardinality`] = {
          cardinality: {
            field: c.id,
          },
        };
      }
      aggs[`${id}_terms`] = {
        terms: {
          field: c.id,
          size: MAX_CHART_COLUMNS,
        },
      };
    }
    return aggs;
  }, {} as Record<string, ChartRequestAgg>);

  if (Object.keys(chartDataAggs).length === 0) {
    return [];
  }

  const respChartsData = await esSearch({
    index: indexPatternTitle,
    size: 0,
    body: {
      query,
      aggs: chartDataAggs,
      size: 0,
    },
  });

  const chartsData: ChartData[] = columnTypes.map(
    (c): ChartData => {
      const fieldType = getFieldType(c.schema);
      const id = stringHash(c.id);

      if (fieldType === KBN_FIELD_TYPES.NUMBER || fieldType === KBN_FIELD_TYPES.DATE) {
        if (aggIntervals[id] === undefined) {
          return {
            type: 'numeric',
            data: [],
            interval: 0,
            stats: [0, 0],
            id: c.id,
          };
        }

        return {
          data: respChartsData.aggregations[`${id}_histogram`].buckets,
          interval: aggIntervals[id].interval,
          stats: [aggIntervals[id].min, aggIntervals[id].max],
          type: 'numeric',
          id: c.id,
        };
      } else if (fieldType === KBN_FIELD_TYPES.STRING || fieldType === KBN_FIELD_TYPES.BOOLEAN) {
        return {
          type: fieldType === KBN_FIELD_TYPES.STRING ? 'ordinal' : 'boolean',
          cardinality:
            fieldType === KBN_FIELD_TYPES.STRING
              ? respChartsData.aggregations[`${id}_cardinality`].value
              : 2,
          data: respChartsData.aggregations[`${id}_terms`].buckets,
          id: c.id,
        };
      }

      return {
        type: 'unsupported',
        id: c.id,
      };
    }
  );

  return chartsData;
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
  type: 'numeric';
}

export const isNumericChartData = (arg: any): arg is NumericChartData => {
  return (
    arg.hasOwnProperty('data') &&
    arg.hasOwnProperty('id') &&
    arg.hasOwnProperty('interval') &&
    arg.hasOwnProperty('stats') &&
    arg.hasOwnProperty('type')
  );
};

interface OrdinalDataItem {
  key: string;
  key_as_string?: string;
  doc_count: number;
}

interface OrdinalChartData {
  type: 'ordinal' | 'boolean';
  cardinality: number;
  data: OrdinalDataItem[];
  id: string;
}

export const isOrdinalChartData = (arg: any): arg is OrdinalChartData => {
  return (
    arg.hasOwnProperty('data') &&
    arg.hasOwnProperty('cardinality') &&
    arg.hasOwnProperty('id') &&
    arg.hasOwnProperty('type')
  );
};

interface UnsupportedChartData {
  id: string;
  type: 'unsupported';
}

export const isUnsupportedChartData = (arg: any): arg is UnsupportedChartData => {
  return arg.hasOwnProperty('type') && arg.type === 'unsupported';
};

type ChartDataItem = NumericDataItem | OrdinalDataItem;
export type ChartData = NumericChartData | OrdinalChartData | UnsupportedChartData;

type LegendText = string | JSX.Element;
const getLegendText = (chartData: ChartData): LegendText => {
  if (chartData.type === 'unsupported') {
    return i18n.translate('xpack.ml.dataGridChart.histogramNotAvailable', {
      defaultMessage: 'Chart not supported.',
    });
  }

  if (chartData.data.length === 0) {
    return i18n.translate('xpack.ml.dataGridChart.notEnoughData', {
      defaultMessage: `0 documents contain field.`,
    });
  }

  if (chartData.type === 'boolean') {
    return (
      <table className="mlDataGridChart__legendBoolean">
        <tbody>
          <tr>
            {chartData.data[0] !== undefined && <td>{chartData.data[0].key_as_string}</td>}
            {chartData.data[1] !== undefined && <td>{chartData.data[1].key_as_string}</td>}
          </tr>
        </tbody>
      </table>
    );
  }

  if (isOrdinalChartData(chartData) && chartData.cardinality <= MAX_CHART_COLUMNS) {
    return i18n.translate('xpack.ml.dataGridChart.singleCategoryLegend', {
      defaultMessage: `{cardinality, plural, one {# category} other {# categories}}`,
      values: { cardinality: chartData.cardinality },
    });
  }

  if (isOrdinalChartData(chartData) && chartData.cardinality > MAX_CHART_COLUMNS) {
    return i18n.translate('xpack.ml.dataGridChart.topCategoriesLegend', {
      defaultMessage: `top {MAX_CHART_COLUMNS} of {cardinality} categories`,
      values: { cardinality: chartData.cardinality, MAX_CHART_COLUMNS },
    });
  }

  if (isNumericChartData(chartData)) {
    const fromValue = Math.round(chartData.stats[0] * 100) / 100;
    const toValue = Math.round(chartData.stats[1] * 100) / 100;

    return fromValue !== toValue ? `${fromValue} - ${toValue}` : '' + fromValue;
  }

  return '';
};

interface ColumnChart {
  data: ChartDataItem[];
  legendText: LegendText;
  xScaleType: XScaleType;
}

export const useColumnChart = (
  chartData: ChartData,
  columnType: EuiDataGridColumn
): ColumnChart => {
  const fieldType = getFieldType(columnType.schema);

  const hoveredRow = useObservable(hoveredRow$);

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

  let data: ChartDataItem[] = [];

  // The if/else if/else is a work-around because `.map()` doesn't work with union types.
  // See TS Caveats for details: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-3.html#caveats
  if (isOrdinalChartData(chartData)) {
    data = chartData.data.map((d: OrdinalDataItem) => ({
      ...d,
      color: getColor(d),
    }));
  } else if (isNumericChartData(chartData)) {
    data = chartData.data.map((d: NumericDataItem) => ({
      ...d,
      color: getColor(d),
    }));
  }

  return {
    data,
    legendText: getLegendText(chartData),
    xScaleType,
  };
};
