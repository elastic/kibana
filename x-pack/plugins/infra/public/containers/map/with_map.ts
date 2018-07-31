/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import { graphql } from 'react-apollo';
import {
  InfraFilter,
  InfraMetric,
  InfraMetricType,
  InfraPath,
  InfraPathType,
  InfraResponse,
  InfraSource,
  InfraTimerange,
} from '../../../common/graphql/types';
import { query } from './query';

interface ChildProps {
  map: InfraResponse;
}

interface Response {
  source: InfraSource;
}

interface Variables {
  id: string;
  timerange: InfraTimerange;
  filters: InfraFilter[];
  path: InfraPath[];
  metrics: InfraMetric[];
}

export const withMap = graphql<
  {}, // OptionProps, this will end up being the options that contain index pattern, filters, etc
  Response,
  Variables,
  ChildProps
>(query, {
  options: () => ({
    variables: {
      id: 'default',
      timerange: {
        interval: '1m',
        to: moment.utc().valueOf(),
        from: moment
          .utc()
          .subtract(1, 'h')
          .valueOf(),
      },
      filters: [],
      metrics: [{ type: InfraMetricType.count }],
      path: [{ id: 'n1', type: InfraPathType.hosts }],
    },
  }),
  props: ({ data }) => ({ map: (data && data.source && data.source.map) || {} }),
});
