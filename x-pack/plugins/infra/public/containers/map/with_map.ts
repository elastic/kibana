/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { graphql } from 'react-apollo';
import { MapQuery } from '../../../common/graphql/types';
import { InfraOptions, InfraWaffleMapGroup } from '../../lib/lib';
import { mapQuery } from './map.gql_query';
import { nodesToWaffleMap } from './nodes_to_wafflemap';

interface IncomingProps {
  options: InfraOptions;
}

interface ChildProps extends IncomingProps {
  map: InfraWaffleMapGroup[];
}

export const withMap = graphql<IncomingProps, MapQuery.Query, MapQuery.Variables, ChildProps>(
  mapQuery,
  {
    options: ({ options: { wafflemap } }) => ({
      fetchPolicy: 'no-cache',
      variables: {
        sourceId: wafflemap.sourceId,
        filters: wafflemap.filters,
        metrics: wafflemap.metrics,
        path: wafflemap.path,
        timerange: wafflemap.timerange,
      },
    }),
    props: ({ data, ownProps }) => {
      return {
        ...ownProps,
        map:
          data && data.source && data.source.map && data.source.map.nodes
            ? nodesToWaffleMap(data.source.map.nodes)
            : [],
      };
    },
  }
);
