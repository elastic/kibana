/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceResolvers } from '../../../common/graphql/types';
import { Events } from '../../lib/events';
import { EventsRequestOptions } from '../../lib/events/types';
import { AppResolvedResult, AppResolverOf } from '../../lib/framework';
import { Context } from '../../lib/types';
import { getFields } from '../../utils/build_query/fields';
import { parseFilterQuery } from '../../utils/serialized_query';
import { QuerySourceResolver } from '../sources/resolvers';

type QueryEventsResolver = AppResolverOf<
  SourceResolvers.GetEventsResolver,
  AppResolvedResult<QuerySourceResolver>,
  Context
>;

interface EventsResolversDeps {
  events: Events;
}

export const createEventsResolvers = (
  libs: EventsResolversDeps
): {
  Source: {
    getEvents: QueryEventsResolver;
  };
} => ({
  Source: {
    async getEvents(source, args, { req }, info) {
      const fields = getFields(info.fieldNodes[0]);
      const options: EventsRequestOptions = {
        sourceConfiguration: source.configuration,
        timerange: args.timerange,
        filterQuery: parseFilterQuery(args.filterQuery || ''),
        fields: fields.map(f => f.replace('events.', '')),
      };
      return libs.events.getEvents(req, options);
    },
  },
});
