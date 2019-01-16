/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import { SourceResolvers } from '../../graphql/types';
import { AppResolverOf, ChildResolverOf } from '../../lib/framework';
import { UncommonProcesses } from '../../lib/uncommon_processes';
import { UncommonProcessesRequestOptions } from '../../lib/uncommon_processes/types';
import { getFields } from '../../utils/build_query/fields';
import { parseFilterQuery } from '../../utils/serialized_query';
import { QuerySourceResolver } from '../sources/resolvers';

type QueryUncommonProcessesResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.UncommonProcessesResolver>,
  QuerySourceResolver
>;

export interface UncommonProcessesResolversDeps {
  uncommonProcesses: UncommonProcesses;
}

export const createUncommonProcessesResolvers = (
  libs: UncommonProcessesResolversDeps
): {
  Source: {
    UncommonProcesses: QueryUncommonProcessesResolver;
  };
} => ({
  Source: {
    async UncommonProcesses(source, args, { req }, info) {
      const fields = getFields(getOr([], 'fieldNodes[0]', info));
      const options: UncommonProcessesRequestOptions = {
        sourceConfiguration: source.configuration,
        timerange: args.timerange,
        pagination: args.pagination,
        filterQuery: parseFilterQuery(args.filterQuery || ''),
        fields: fields.map(field => field.replace('edges.node.', '')),
      };
      return libs.uncommonProcesses.getUncommonProcesses(req, options);
    },
  },
});
