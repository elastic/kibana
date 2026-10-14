/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  accessKnownApmEventFields,
  getMissingRequiredApmFields,
  type ApmDocument,
} from '@kbn/apm-data-access-plugin/server/utils';
import type { FlattenedApmEvent } from '@kbn/apm-data-access-plugin/server/utils/utility_types';
import type { Logger } from '@kbn/core/server';

/**
 * Number of skipped documents a single accessor reports at `warn` level. Documents skipped
 * beyond that are reported at `debug` level, so that an index where every document is
 * malformed cannot flood the logs on a route the UI refetches.
 */
const MAX_WARNINGS_PER_ACCESSOR = 5;

export interface SearchHitWithFields<T> {
  _id?: string;
  _index?: string;
  fields?: T;
}

/**
 * Validates search hits against a set of required fields, returning `undefined` instead of
 * throwing when a hit does not have them all.
 *
 * Documents coming from user owned data streams, such as `logs-*`, are not guaranteed to follow
 * the APM schema, so a single malformed document would otherwise fail the whole request. Skipped
 * documents are logged with their id and index so they can be traced back.
 *
 * Create one accessor per request, since it keeps track of how many documents it has reported:
 *
 * ```ts
 * const accessor = createApmEventFieldsAccessor({ logger, operation: 'get_trace_errors' });
 *
 * return compactMap(response.hits.hits, (hit) => {
 *   const event = accessor.tryAccess(hit, requiredFields);
 *   return event ? toTraceError(event) : null;
 * });
 * ```
 */
export function createApmEventFieldsAccessor({
  logger,
  operation,
}: {
  logger: Logger;
  operation: string;
}) {
  let skippedCount = 0;

  function reportSkipped(hit: SearchHitWithFields<unknown>, reason: string) {
    skippedCount++;

    const message = `[${operation}] Skipping document with id [${
      hit._id ?? 'unknown'
    }] from index [${hit._index ?? 'unknown'}]: ${reason}`;

    if (skippedCount > MAX_WARNINGS_PER_ACCESSOR) {
      logger.debug(message);
      return;
    }

    logger.warn(message);

    if (skippedCount === MAX_WARNINGS_PER_ACCESSOR) {
      logger.warn(
        `[${operation}] Reached ${MAX_WARNINGS_PER_ACCESSOR} skipped documents, further ones are logged at debug level`
      );
    }
  }

  return {
    tryAccess<T extends Partial<FlattenedApmEvent>, K extends keyof FlattenedApmEvent>(
      hit: SearchHitWithFields<T>,
      requiredFields: K[]
    ): ApmDocument<T, K> | undefined {
      if (!hit.fields) {
        reportSkipped(hit, 'Event has no fields');
        return undefined;
      }

      const missingRequiredFields = getMissingRequiredApmFields(hit.fields, requiredFields);

      if (missingRequiredFields.length) {
        reportSkipped(
          hit,
          `Missing required fields (${missingRequiredFields.join(', ')}) in event`
        );
        return undefined;
      }

      // `requireFields` revalidates what was just checked, but it is what narrows the document
      // type to mark the required fields as present.
      return accessKnownApmEventFields(hit.fields).requireFields(requiredFields);
    },
  };
}
