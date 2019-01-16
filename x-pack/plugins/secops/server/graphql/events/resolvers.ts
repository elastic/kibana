/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import { SourceResolvers } from '../../graphql/types';
import { Events } from '../../lib/events';
import { EventsRequestOptions } from '../../lib/events/types';
import { AppResolverOf, ChildResolverOf } from '../../lib/framework';
import { getFields } from '../../utils/build_query/fields';
import { parseFilterQuery } from '../../utils/serialized_query';
import { QuerySourceResolver } from '../sources/resolvers';

type QueryEventsResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.EventsResolver>,
  QuerySourceResolver
>;

export interface EventsResolversDeps {
  events: Events;
}

export const createEventsResolvers = (
  libs: EventsResolversDeps
): {
  Source: {
    Events: QueryEventsResolver;
  };
} => ({
  Source: {
    async Events(source, args, { req }, info) {
      const fields = getFields(getOr([], 'fieldNodes[0]', info));
      const options: EventsRequestOptions = {
        sourceConfiguration: source.configuration,
        timerange: args.timerange!,
        pagination: args.pagination,
        sortField: args.sortField,
        filterQuery: parseFilterQuery(args.filterQuery || ''),
        fields: fields.map(f => f.replace('edges.node.', '')),
      };
      return libs.events.getEvents(req, options);
    },
  },
});
