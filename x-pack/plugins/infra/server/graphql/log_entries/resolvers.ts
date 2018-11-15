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
import { UsageCollector } from '../../usage/usage_collector';
import { parseFilterQuery } from '../../utils/serialized_query';
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

export type InfraSourceLogSummaryBetweenResolver = InfraResolverOf<
  InfraSourceResolvers.LogSummaryBetweenResolver,
  InfraResolvedResult<QuerySourceResolver>,
  InfraContext
>;

export const createLogEntriesResolvers = (libs: {
  logEntries: InfraLogEntriesDomain;
}): {
  InfraSource: {
    logEntriesAround: InfraSourceLogEntriesAroundResolver;
    logEntriesBetween: InfraSourceLogEntriesBetweenResolver;
    logSummaryBetween: InfraSourceLogSummaryBetweenResolver;
  };
  InfraLogMessageSegment: {
    __resolveType(
      messageSegment: InfraLogMessageSegment
    ): 'InfraLogMessageFieldSegment' | 'InfraLogMessageConstantSegment' | null;
  };
} => ({
  InfraSource: {
    async logEntriesAround(source, args, { req }) {
      const countBefore = args.countBefore || 0;
      const countAfter = args.countAfter || 0;

      const { entriesBefore, entriesAfter } = await libs.logEntries.getLogEntriesAround(
        req,
        source.id,
        args.key,
        countBefore + 1,
        countAfter + 1,
        parseFilterQuery(args.filterQuery),
        args.highlightQuery || undefined
      );

      const hasMoreBefore = entriesBefore.length > countBefore;
      const hasMoreAfter = entriesAfter.length > countAfter;

      const entries = [
        ...(hasMoreBefore ? entriesBefore.slice(1) : entriesBefore),
        ...(hasMoreAfter ? entriesAfter.slice(0, -1) : entriesAfter),
      ];

      return {
        start: entries.length > 0 ? entries[0].key : null,
        end: entries.length > 0 ? entries[entries.length - 1].key : null,
        hasMoreBefore,
        hasMoreAfter,
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
        parseFilterQuery(args.filterQuery),
        args.highlightQuery || undefined
      );

      return {
        start: entries.length > 0 ? entries[0].key : null,
        end: entries.length > 0 ? entries[entries.length - 1].key : null,
        hasMoreBefore: true,
        hasMoreAfter: true,
        filterQuery: args.filterQuery,
        highlightQuery: args.highlightQuery,
        entries,
      };
    },
    async logSummaryBetween(source, args, { req }) {
      UsageCollector.countLogs();
      const buckets = await libs.logEntries.getLogSummaryBucketsBetween(
        req,
        source.id,
        args.start,
        args.end,
        args.bucketSize,
        parseFilterQuery(args.filterQuery)
      );

      return {
        start: buckets.length > 0 ? buckets[0].start : null,
        end: buckets.length > 0 ? buckets[buckets.length - 1].end : null,
        buckets,
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
