/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash';
import moment from 'moment';
import { graphql } from 'react-apollo';
import uuid from 'uuid';
import {
  InfraFilterInput,
  InfraMetricInput,
  InfraMetricType,
  InfraPathInput,
  InfraPathType,
  InfraSource,
  InfraTimerangeInput,
} from '../../../common/graphql/types';
import { InfraWaffleMapGroup } from '../../lib/lib';
import { nodesToWaffleMap } from '../libs/nodes_to_wafflemap';
import { query } from './query';

interface ChildProps {
  map: InfraWaffleMapGroup[];
}

interface Response {
  source: InfraSource;
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
      path: [
        { id: uuid.v1(), type: InfraPathType.terms, field: 'metricset.module' },
        { id: uuid.v1(), type: InfraPathType.terms, field: 'metricset.name' },
        { id: uuid.v1(), type: InfraPathType.hosts },
      ],
    },
  }),
  props: ({ data }) => {
    const nodes = get(data, 'source.map.nodes', []);
    return { map: nodesToWaffleMap(nodes) };
  },
});
