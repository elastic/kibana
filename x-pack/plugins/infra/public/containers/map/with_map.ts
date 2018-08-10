/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import { graphql } from 'react-apollo';
import uuid from 'uuid';
import {
  InfraFilterInput,
  InfraMetricInput,
  InfraMetricType,
  InfraPathInput,
  InfraPathType,
  InfraTimerangeInput,
  MapQuery,
} from '../../../common/graphql/types';
import { InfraWaffleMapGroup } from '../../lib/lib';
import { nodesToWaffleMap } from './nodes_to_wafflemap';
import { mapQuery } from './query';

interface ChildProps {
  map: InfraWaffleMapGroup[];
}

interface Variables {
  id: string;
  timerange: InfraTimerangeInput;
  filters: InfraFilterInput[];
  path: InfraPathInput[];
  metrics: InfraMetricInput[];
}

export const withMap = graphql<
  {}, // OptionProps, this will end up being the options that contain index pattern, filters, etc
  MapQuery.Query,
  Variables,
  ChildProps
>(mapQuery, {
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
      path: [
        { id: uuid.v1(), type: InfraPathType.terms, field: 'metricset.module' },
        { id: uuid.v1(), type: InfraPathType.terms, field: 'metricset.name' },
        { id: uuid.v1(), type: InfraPathType.hosts },
      ],
    },
  }),
  props: ({ data }) => {
    const emptyResponse = { map: [] };
    if (!data) {
      return emptyResponse;
    }
    if (!data.source) {
      return emptyResponse;
    }
    if (!data.source.map) {
      return emptyResponse;
    }
    const { nodes } = data.source.map;
    if (!nodes) {
      return emptyResponse;
    }
    return { map: nodesToWaffleMap(nodes) };
  },
});
