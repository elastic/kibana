/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { flow } from 'fp-ts/lib/function';
import { ReindexSavedObject } from '../../../common/types';

export interface SortedReindexSavedObjects {
  /**
   * Reindex objects sorted into this array represent Elasticsearch reindex tasks that
   * have no inherent order and are considered to be processed in parallel.
   */
  parallel: ReindexSavedObject[];

  /**
   * Reindex objects sorted into this array represent Elasticsearch reindex tasks that
   * are consistently ordered (see {@link orderQueuedReindexOperations}) and should be
   * processed in order.
   */
  queue: ReindexSavedObject[];
}

const sortReindexOperations = (ops: ReindexSavedObject[]): SortedReindexSavedObjects => {
  const parallel: ReindexSavedObject[] = [];
  const queue: ReindexSavedObject[] = [];
  for (const op of ops) {
    if (op.attributes.reindexOptions?.queueSettings) {
      queue.push(op);
    } else {
      parallel.push(op);
    }
  }

  return {
    parallel,
    queue,
  };
};
const orderQueuedReindexOperations = ({
  parallel,
  queue,
}: SortedReindexSavedObjects): SortedReindexSavedObjects => ({
  parallel,
  // Sort asc
  queue: queue.sort(
    (a, b) =>
      a.attributes.reindexOptions!.queueSettings!.queuedAt -
      b.attributes.reindexOptions!.queueSettings!.queuedAt
  ),
});

export const isQueuedOp = (op: ReindexSavedObject) =>
  Boolean(op.attributes.reindexOptions?.queueSettings);

export const queuedOpHasStarted = (op: ReindexSavedObject) =>
  Boolean(op.attributes.reindexOptions?.queueSettings?.startedAt);

export const sortAndOrderReindexOperations = flow(
  sortReindexOperations,
  orderQueuedReindexOperations
);
