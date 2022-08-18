/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React from 'react';
import { of } from 'rxjs';
import { Story } from '@storybook/react';
import { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { TimeRange } from '@kbn/es-query';
import { Aggregation, AGGREGATION_NAME } from '../../hooks/use_aggregated_indicators';
import { DEFAULT_TIME_RANGE } from '../../hooks/use_filters/utils';
import { IndicatorsBarChartWrapper } from './indicators_barchart_wrapper';

export default {
  component: IndicatorsBarChartWrapper,
  title: 'IndicatorsBarChartWrapper',
};

const mockTimeRange: TimeRange = DEFAULT_TIME_RANGE;
const mockIndexPatterns: DataView[] = [
  {
    fields: [
      {
        name: '@timestamp',
        type: 'date',
      } as DataViewField,
      {
        name: 'threat.feed.name',
        type: 'string',
      } as DataViewField,
    ],
  } as DataView,
];

const validDate: string = '1 Jan 2022 00:00:00 GMT';
const numberOfDays: number = 1;
const aggregation1: Aggregation = {
  events: {
    buckets: [
      {
        doc_count: 0,
        key: 1641016800000,
        key_as_string: '1 Jan 2022 06:00:00 GMT',
      },
      {
        doc_count: 10,
        key: 1641038400000,
        key_as_string: '1 Jan 2022 12:00:00 GMT',
      },
    ],
  },
  doc_count: 0,
  key: '[Filebeat] AbuseCH Malware',
};
const aggregation2: Aggregation = {
  events: {
    buckets: [
      {
        doc_count: 20,
        key: 1641016800000,
        key_as_string: '1 Jan 2022 06:00:00 GMT',
      },
      {
        doc_count: 8,
        key: 1641038400000,
        key_as_string: '1 Jan 2022 12:00:00 GMT',
      },
    ],
  },
  doc_count: 0,
  key: '[Filebeat] AbuseCH MalwareBazaar',
};
const KibanaReactContext = createKibanaReactContext({
  data: {
    search: {
      search: () =>
        of({
          rawResponse: {
            aggregations: {
              [AGGREGATION_NAME]: {
                buckets: [aggregation1, aggregation2],
              },
            },
          },
        }),
    },
    query: {
      timefilter: {
        timefilter: {
          calculateBounds: () => ({
            min: moment(validDate),
            max: moment(validDate).add(numberOfDays, 'days'),
          }),
        },
      },
    },
  },
  uiSettings: { get: () => {} },
} as unknown as Partial<CoreStart>);

export const Default: Story<void> = () => {
  return (
    <KibanaReactContext.Provider>
      <IndicatorsBarChartWrapper timeRange={mockTimeRange} indexPatterns={mockIndexPatterns} />
    </KibanaReactContext.Provider>
  );
};
