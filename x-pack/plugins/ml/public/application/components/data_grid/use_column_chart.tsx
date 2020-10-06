/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { BehaviorSubject } from 'rxjs';
import React from 'react';

import useObservable from 'react-use/lib/useObservable';

import { euiPaletteColorBlind, EuiDataGridColumn } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { KBN_FIELD_TYPES } from '../../../../../../../src/plugins/data/public';

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

export const getFieldType = (schema: EuiDataGridColumn['schema']): KBN_FIELD_TYPES | undefined => {
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

interface NumericDataItem {
  key: number;
  key_as_string?: string | number;
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
      key_as_string: d.key_as_string ?? d.key,
      color: getColor(d),
    }));
  } else if (isNumericChartData(chartData)) {
    data = chartData.data.map((d: NumericDataItem) => ({
      ...d,
      key_as_string: d.key_as_string || d.key,
      color: getColor(d),
    }));
  }

  return {
    data,
    legendText: getLegendText(chartData),
    xScaleType,
  };
};
