/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// This module provides a helper to perform retries on a function if the
// function ends up throwing a SavedObject 409 conflict.  This can happen
// when alert SO's are updated in the background, and will avoid having to
// have the caller make explicit conflict checks, where the conflict was
// caused by a background update.

import { KueryNode } from '@kbn/es-query';
import {
  Logger,
  SavedObjectsBulkUpdateObject,
  SavedObjectsUpdateResponse,
} from '../../../../../../src/core/server';
import { convertRuleIdsToKueryNode } from '../../lib';
import { BulkEditError, BulkEditOptions } from '../rules_client';
import { AlertTypeParams, RawRule } from '../../types';

// number of times to retry when conflicts occur
export const RetryForConflictsAttempts = 2;

// milliseconds to wait before retrying when conflicts occur
// note: we considered making this random, to help avoid a stampede, but
// with 1 retry it probably doesn't matter, and adding randomness could
// make it harder to diagnose issues
const RetryForConflictsDelay = 250;

type BulkEditObjects = <P extends AlertTypeParams>({
  filter,
  operations,
  paramsModifier,
}: {
  filter: KueryNode;
  operations: BulkEditOptions<P>['operations'];
  paramsModifier: BulkEditOptions<P>['paramsModifier'];
}) => Promise<{
  apiKeysToInvalidate: string[];
  rules: Array<SavedObjectsBulkUpdateObject<RawRule>>;
  resultSavedObjects: Array<SavedObjectsUpdateResponse<RawRule>>;
  errors: BulkEditError[];
}>;

export const retryIfBulkEditConflicts = async <P extends AlertTypeParams>(
  logger: Logger,
  name: string,
  bulkEditObjects: BulkEditObjects,
  filter: KueryNode,
  operations: BulkEditOptions<P>['operations'],
  paramsModifier: BulkEditOptions<P>['paramsModifier'],
  retries: number = RetryForConflictsAttempts,
  apiKeysToInvalidate: string[] = [],
  results: Array<SavedObjectsUpdateResponse<RawRule>> = [],
  errors: BulkEditError[] = []
): Promise<{
  apiKeysToInvalidate: string[];
  results: Array<SavedObjectsUpdateResponse<RawRule>>;
  errors: BulkEditError[];
}> => {
  // run the operation, return if no errors or throw if not a conflict error
  try {
    const {
      apiKeysToInvalidate: localApiKeysToInvalidate,
      resultSavedObjects,
      errors: localErrors,
      rules: localRules,
    } = await bulkEditObjects({
      filter,
      operations,
      paramsModifier,
    });

    const idsWithConflictError = resultSavedObjects.reduce<Set<string>>((acc, item) => {
      if (item.type === 'alert' && item?.error?.statusCode === 409) {
        return acc.add(item.id);
      }
      return acc;
    }, new Set());

    if (idsWithConflictError.size > 0) {
      const newBulkUpdateObjects = localRules.filter((obj) => idsWithConflictError.has(obj.id));
      if (retries <= 0) {
        logger.warn(`${name} conflicts, exceeded retries`);
        newBulkUpdateObjects.forEach((obj) => {
          localErrors.push({
            message: '',
            rule: {
              id: obj.id,
              name: obj.attributes?.name ?? '',
            },
          });
        });
      } else {
        logger.debug(`${name} conflicts, retrying ...`);
        const filterKueryNode = convertRuleIdsToKueryNode(Array.from(idsWithConflictError));
        await waitBeforeNextRetry();
        return await retryIfBulkEditConflicts(
          logger,
          name,
          bulkEditObjects,
          filterKueryNode,
          operations,
          paramsModifier,
          retries - 1,
          [...apiKeysToInvalidate, ...localApiKeysToInvalidate],
          [...results, ...resultSavedObjects.filter((res) => res.error === undefined)],
          [...errors, ...localErrors]
        );
      }
    }
    return {
      apiKeysToInvalidate: [...apiKeysToInvalidate, ...localApiKeysToInvalidate],
      results: [...results, ...resultSavedObjects.filter((res) => res.error === undefined)],
      errors: [...errors, ...localErrors],
    };
  } catch (err) {
    throw err;
  }
};

async function waitBeforeNextRetry(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, RetryForConflictsDelay));
}
