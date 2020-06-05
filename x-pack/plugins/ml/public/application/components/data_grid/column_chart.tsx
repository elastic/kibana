/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import React, { useEffect, useState, FC } from 'react';
import { BehaviorSubject } from 'rxjs';

import { BarSeries, Chart, Settings } from '@elastic/charts';
import { EuiText } from '@elastic/eui';

// import { StaticIndexPattern } from 'ui/index_patterns';

// TODO: Below import is temporary, use `react-use` lib instead.
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { useObservable } from 'react-use';
import { KBN_FIELD_TYPES } from '../../../../../../../src/plugins/data/public';

export const hoveredRow$ = new BehaviorSubject<any | null>(null);

interface Props {
  indexPatternTitle: string;
  columnType: any;
  query: any;
  api: any;
}

interface DataItem {
  key: string;
  x: string | number;
  y: number;
}

const MAX_CHART_COLUMNS = 20;

export const ColumnChart: FC<Props> = ({ indexPatternTitle, columnType, query, api }) => {
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

  if (data.length === 0 || fieldType === KBN_FIELD_TYPES.OBJECT) {
    return null;
  }

  function getXScaleType(kbnFieldType: KBN_FIELD_TYPES) {
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
  }

  const xScaleType = getXScaleType(fieldType);

  const getColor = (d: DataItem) => {
    const barColor = '#55b399';

    if (hoveredRow === undefined || hoveredRow === null) {
      return barColor;
    }

    if (xScaleType === 'ordinal' && hoveredRow._source[columnType.id] === d.key) {
      return barColor;
    }

    if (
      xScaleType === 'linear' &&
      hoveredRow._source[columnType.id] >= +d.key &&
      hoveredRow._source[columnType.id] < +d.key + interval
    ) {
      return barColor;
    }

    if (
      xScaleType === 'time' &&
      moment(hoveredRow._source[columnType.id]).unix() * 1000 >= +d.key &&
      moment(hoveredRow._source[columnType.id]).unix() * 1000 < +d.key + interval
    ) {
      return barColor;
    }

    if (xScaleType === 'time') {
      // console.log('time', moment(hoveredRow._source[columnType.id]).unix(), +d.key, d.key);
    }
    return '#d4dae5';
  };

  const coloredData = data.map((d) => ({ ...d, color: getColor(d) }));

  return (
    <>
      <div style={{ width: '100%', height: '75px' }}>
        <Chart className="story-chart">
          <Settings
            theme={{
              chartMargins: {
                left: 3,
                right: 3,
                top: 5,
                bottom: 1,
              },
              chartPaddings: {
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
              },
              scales: { barsPadding: 0.1 },
            }}
          />
          <BarSeries
            id="source_index"
            name="count"
            xScaleType={xScaleType}
            yScaleType="linear"
            xAccessor="key"
            yAccessors={['doc_count']}
            styleAccessor={(d) => d.datum.color}
            data={coloredData}
          />
        </Chart>
      </div>
      <div
        style={{
          display: 'block',
          overflow: 'hidden',
        }}
      >
        <EuiText
          size="xs"
          color="subdued"
          style={{
            marginLeft: '3px',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          <i>
            {(fieldType === KBN_FIELD_TYPES.STRING || fieldType === KBN_FIELD_TYPES.BOOLEAN) &&
              cardinality === 1 &&
              `${cardinality} category`}
            {(fieldType === KBN_FIELD_TYPES.STRING || fieldType === KBN_FIELD_TYPES.BOOLEAN) &&
              cardinality > MAX_CHART_COLUMNS &&
              `top ${MAX_CHART_COLUMNS} of ${cardinality} categories`}
            {(fieldType === KBN_FIELD_TYPES.STRING || fieldType === KBN_FIELD_TYPES.BOOLEAN) &&
              cardinality <= MAX_CHART_COLUMNS &&
              cardinality > 1 &&
              `${cardinality} categories`}
            {(fieldType === KBN_FIELD_TYPES.NUMBER || fieldType === KBN_FIELD_TYPES.DATE) &&
              `${Math.round(stats[0] * 100) / 100} - ${Math.round(stats[1] * 100) / 100}`}
          </i>
        </EuiText>
      </div>
    </>
  );
};
