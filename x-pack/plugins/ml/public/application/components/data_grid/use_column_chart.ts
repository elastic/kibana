/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { useEffect, useState } from 'react';
import { BehaviorSubject } from 'rxjs';

import { useObservable } from 'react-use';

import { euiPaletteColorBlind } from '@elastic/eui';

import { KBN_FIELD_TYPES } from '../../../../../../../src/plugins/data/public';

export const hoveredRow$ = new BehaviorSubject<any | null>(null);

interface DataItem {
  key: string;
  x: string | number;
  y: number;
}

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

export const useColumnChart = (
  indexPatternTitle: string,
  columnType: any,
  query: any,
  api: any
) => {
  const [cardinality, setCardinality] = useState(0);
  const [data, setData] = useState<DataItem[]>([]);
  const [interval, setInterval] = useState(0);
  const [stats, setStats] = useState([0, 0]);

  const hoveredRow = useObservable(hoveredRow$);

  let fieldType: KBN_FIELD_TYPES;

  switch (columnType.schema) {
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
      setCardinality(resp.aggregations.categories.value);
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

      setStats([respStats.aggregations.min_max.min, respStats.aggregations.min_max.max]);

      const delta = respStats.aggregations.min_max.max - respStats.aggregations.min_max.min;

      let aggInterval = 1;

      if (delta > MAX_CHART_COLUMNS) {
        aggInterval = Math.round(delta / MAX_CHART_COLUMNS);
      }

      if (delta <= 1) {
        aggInterval = delta / MAX_CHART_COLUMNS;
      }
      setInterval(aggInterval);

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

      setData(resp.aggregations.chart.buckets);
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
      setData(resp.aggregations.chart.buckets);
    } catch (e) {
      throw new Error(e);
    }
  };

  useEffect(() => {
    if (fieldType === KBN_FIELD_TYPES.NUMBER || fieldType === KBN_FIELD_TYPES.DATE) {
      fetchChartHistogramData();
    }
    if (
      fieldType === KBN_FIELD_TYPES.STRING ||
      fieldType === KBN_FIELD_TYPES.IP ||
      fieldType === KBN_FIELD_TYPES.BOOLEAN
    ) {
      fetchCardinality();
      fetchChartTermsData();
    }
  }, [JSON.stringify(query)]);

  const xScaleType = getXScaleType(fieldType);

  const getColor = (d: DataItem) => {
    if (hoveredRow === undefined || hoveredRow === null) {
      return BAR_COLOR;
    }

    if (xScaleType === 'ordinal' && hoveredRow._source[columnType.id] === d.key) {
      return BAR_COLOR;
    }

    if (
      xScaleType === 'linear' &&
      hoveredRow._source[columnType.id] >= +d.key &&
      hoveredRow._source[columnType.id] < +d.key + interval
    ) {
      return BAR_COLOR;
    }

    if (
      xScaleType === 'time' &&
      moment(hoveredRow._source[columnType.id]).unix() * 1000 >= +d.key &&
      moment(hoveredRow._source[columnType.id]).unix() * 1000 < +d.key + interval
    ) {
      return BAR_COLOR;
    }

    return BAR_COLOR_BLUR;
  };

  const coloredData = data.map((d) => ({ ...d, color: getColor(d) }));

  return { cardinality, coloredData, fieldType, stats, xScaleType, MAX_CHART_COLUMNS };
};
