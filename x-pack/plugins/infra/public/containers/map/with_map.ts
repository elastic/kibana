/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as moment from 'moment';
import { graphql } from 'react-apollo';

import { InfraMetricType, InfraPathType, MapQuery } from '../../../common/graphql/types';
import { InfraWaffleMapGroup } from '../../lib/lib';
import { mapQuery } from './map.gql_query';
import { nodesToWaffleMap } from './nodes_to_wafflemap';

interface ChildProps {
  map: InfraWaffleMapGroup[];
}

export const withMap = graphql<
  {}, // OptionProps, this will end up being the options that contain index pattern, filters, etc
  MapQuery.Query,
  MapQuery.Variables,
  ChildProps
>(mapQuery, {
  options: () => ({
    fetchPolicy: 'no-cache',
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
        { type: InfraPathType.terms, field: 'metricset.module' },
        { type: InfraPathType.terms, field: 'metricset.name' },
        { type: InfraPathType.hosts },
      ],
    },
  }),
  props: ({ data }) => {
    return {
      map:
        data && data.source && data.source.map && data.source.map.nodes
          ? nodesToWaffleMap(data.source.map.nodes)
          : [],
    };
  },
});
