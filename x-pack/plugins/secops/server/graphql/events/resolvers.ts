/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceResolvers } from '../../graphql/types';
import { Events } from '../../lib/events';
import { AppResolverOf, ChildResolverOf } from '../../lib/framework';
import { createOptions } from '../../utils/build_query/create_options';
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
      const options = createOptions(source, args, info);
      return libs.events.getEvents(req, options);
    },
  },
});
