/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import { SourceResolvers } from '../../graphql/types';
import { AppResolverOf, ChildResolverOf } from '../../lib/framework';
import { Hosts } from '../../lib/hosts';
import { HostsRequestOptions } from '../../lib/hosts/types';
import { getFields } from '../../utils/build_query/fields';
import { parseFilterQuery } from '../../utils/serialized_query';
import { QuerySourceResolver } from '../sources/resolvers';

type QueryHostsResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.HostsResolver>,
  QuerySourceResolver
>;

export interface HostsResolversDeps {
  hosts: Hosts;
}

export const createHostsResolvers = (
  libs: HostsResolversDeps
): {
  Source: {
    Hosts: QueryHostsResolver;
  };
} => ({
  Source: {
    async Hosts(source, args, { req }, info) {
      const fields = getFields(getOr([], 'fieldNodes[0]', info));
      const options: HostsRequestOptions = {
        sourceConfiguration: source.configuration,
        timerange: args.timerange,
        pagination: args.pagination,
        filterQuery: parseFilterQuery(args.filterQuery || ''),
        fields: fields.map(f => f.replace('edges.node.', '')),
      };
      return libs.hosts.getHosts(req, options);
    },
  },
});
