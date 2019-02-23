/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLScalarType, Kind } from 'graphql';

import { SourceResolvers } from '../../graphql/types';
import { Events } from '../../lib/events';
import { AppResolverOf, ChildResolverOf } from '../../lib/framework';
import { createOptions } from '../../utils/build_query/create_options';
import { QuerySourceResolver } from '../sources/resolvers';

type QueryEventsResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.EventsResolver>,
  QuerySourceResolver
>;

type QueryEventDetailsResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.EventDetailsResolver>,
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
    EventDetails: QueryEventDetailsResolver;
  };
} => ({
  Source: {
    async Events(source, args, { req }, info) {
      const options = createOptions(source, args, info);
      return libs.events.getEvents(req, options);
    },
    async EventDetails(source, args, { req }, info) {
      return libs.events.getEventDetails(req, {
        indexName: args.indexName,
        eventId: args.eventId,
      });
    },
  },
});

const detailItemValueScalar = new GraphQLScalarType({
  name: 'DetailItemValue',
  description: 'Represents value in detail item from the timeline who wants to more than one type',
  serialize(value): string {
    return value;
  },
  parseValue(value) {
    return value;
  },
  parseLiteral(ast) {
    switch (ast.kind) {
      case Kind.INT:
        return parseInt(ast.value, 10);
      case Kind.FLOAT:
        return parseFloat(ast.value);
      case Kind.STRING:
        return ast.value;
      case Kind.LIST:
        return ast.values;
      case Kind.OBJECT:
        return ast.fields;
    }
    return null;
  },
});

export const createScalarDetailItemValueResolvers = () => ({
  DetailItemValue: detailItemValueScalar,
});
