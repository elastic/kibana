/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  InfraLogMessageConstantSegment,
  InfraLogMessageFieldSegment,
  InfraLogMessageSegment,
  InfraSourceResolvers,
} from '../../../common/graphql/types';
import { InfraResolvedResult, InfraResolverOf } from '../../lib/adapters/framework';
import { InfraLogEntriesDomain } from '../../lib/domains/log_entries_domain';
import { InfraContext } from '../../lib/infra_types';
import { QuerySourceResolver } from '../sources/resolvers';

export type InfraSourceLogEntriesAroundResolver = InfraResolverOf<
  InfraSourceResolvers.LogEntriesAroundResolver,
  InfraResolvedResult<QuerySourceResolver>,
  InfraContext
>;

export type InfraSourceLogEntriesBetweenResolver = InfraResolverOf<
  InfraSourceResolvers.LogEntriesBetweenResolver,
  InfraResolvedResult<QuerySourceResolver>,
  InfraContext
>;

export const createLogEntriesResolvers = (libs: {
  logEntries: InfraLogEntriesDomain;
}): {
  InfraSource: {
    logEntriesAround: InfraSourceLogEntriesAroundResolver;
    logEntriesBetween: InfraSourceLogEntriesBetweenResolver;
  };
  InfraLogMessageSegment: {
    __resolveType(
      messageSegment: InfraLogMessageSegment
    ): 'InfraLogMessageFieldSegment' | 'InfraLogMessageConstantSegment' | null;
  };
} => ({
  InfraSource: {
    async logEntriesAround(source, args, { req }) {
      const entries = await libs.logEntries.getLogEntriesAround(
        req,
        source.id,
        args.key,
        args.countBefore || 0,
        args.countAfter || 0,
        args.filterQuery || undefined,
        args.highlightQuery || undefined
      );

      return {
        start: entries.length > 0 ? entries[0].key : null,
        end: entries.length > 0 ? entries[entries.length - 1].key : null,
        filterQuery: args.filterQuery,
        highlightQuery: args.highlightQuery,
        entries,
      };
    },
    async logEntriesBetween(source, args, { req }) {
      const entries = await libs.logEntries.getLogEntriesBetween(
        req,
        source.id,
        args.startKey,
        args.endKey,
        args.filterQuery || undefined,
        args.highlightQuery || undefined
      );

      return {
        start: entries.length > 0 ? entries[0].key : null,
        end: entries.length > 0 ? entries[entries.length - 1].key : null,
        filterQuery: args.filterQuery,
        highlightQuery: args.highlightQuery,
        entries,
      };
    },
  },
  InfraLogMessageSegment: {
    __resolveType: (messageSegment: InfraLogMessageSegment) => {
      if (isConstantSegment(messageSegment)) {
        return 'InfraLogMessageConstantSegment';
      }

      if (isFieldSegment(messageSegment)) {
        return 'InfraLogMessageFieldSegment';
      }

      return null;
    },
  },
});

const isConstantSegment = (
  segment: InfraLogMessageSegment
): segment is InfraLogMessageConstantSegment => 'constant' in segment;

const isFieldSegment = (segment: InfraLogMessageSegment): segment is InfraLogMessageFieldSegment =>
  'field' in segment && 'value' in segment && 'highlights' in segment;
