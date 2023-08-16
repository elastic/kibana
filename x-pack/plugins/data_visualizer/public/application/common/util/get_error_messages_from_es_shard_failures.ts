/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { isDefined } from '@kbn/ml-is-defined';

export const getErrorMessagesFromEsShardFailures = (arg?: unknown): string[] => {
  if (isPopulatedObject<string, { failures: object[] }>(arg, ['_shards'])) {
    return (arg._shards.failures ?? [])
      .map((failure) =>
        isPopulatedObject<string, { reason?: string }>(failure, ['reason']) && failure.reason.reason
          ? failure.reason.reason
          : undefined
      )
      .filter(isDefined);
  }
  return [];
};
