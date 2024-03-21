/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

export interface BatchHandlerCallbackOptions<T = unknown> {
  batch: number;
  data: T[];
}

export interface QueueProcessorOptions<T = unknown> {
  batchHandler: (batch: BatchHandlerCallbackOptions<T>) => Promise<void>;
  batchSize?: number;
  logger?: Logger;
  /**
   * Used when `logger` is passed. It will be used to define the logging messages context path.
   * Defaults to the name of the callback provided in `batchHandler`
   */
  key?: string;
}

/**
 * Process an un-bound amount of items in batches. Each batch is process once the queued reach the
 * `batchSize`, thus processing is gradually executed ensuring that data is not held in memory
 * for too long. Once all items are added to the Queue, calling
 * `.complete()` will ensure they are all processed.
 *
 * @example
 * const processor = new QueueProcessor<{ id: string }>({
 *   batchHandler: ({ data, batch }) => {
 *     // data === array of `{ id: string }`
 *     // batch === batch number
 *   }
 * });
 *
 * const myIdList = [ .... ]; // Array with 50 string
 *
 * for (const id of myIdList) {
 *   batchHandler.addToQueue({ id: id});
 * }
 *
 * await processor.complete();
 */
export class QueueProcessor<T = unknown> {
  private readonly batchSize: number;
  private readonly batchHandler: QueueProcessorOptions<T>['batchHandler'];
  private readonly logger: Logger | undefined = undefined;

  private queue: T[] = [];
  private processingPromise: Promise<void> | undefined = undefined;
  private batchCount = 0;
  private itemsProcessedCount = 0;

  constructor({
    batchHandler,
    batchSize = 10,
    logger,
    key = 'QueueProcessor',
  }: QueueProcessorOptions<T>) {
    if (batchSize < 1 || !Number.isFinite(batchSize)) {
      throw new Error(`batchSize must be a number greater than zero`);
    }

    this.batchSize = batchSize;
    this.batchHandler = batchHandler;
    this.logger = logger ? logger.get(key) : undefined;
  }

  protected log(
    message: string,
    output: keyof Pick<Logger, 'info' | 'warn' | 'error' | 'debug'> = 'info'
  ): void {
    if (this.logger) {
      this.logger[output](message);
    }
  }

  protected async processQueue(all: boolean = false) {
    if (this.processingPromise || this.queue.length === 0) {
      return;
    }

    const runThroughQueue = async () => {
      let hasMoreData = true;

      while (hasMoreData) {
        try {
          if (all || this.queue.length >= this.batchSize) {
            const batchPage = this.queue.splice(0, this.batchSize);
            const batchPageSize = batchPage.length;
            const remainingItemsSize = this.queue.length;

            hasMoreData = (all && remainingItemsSize > 0) || remainingItemsSize >= this.batchSize;
            this.itemsProcessedCount += batchPageSize;
            this.batchCount++;

            try {
              this.log(
                `Processing batch [${this.batchCount}] with [${batchPageSize}] items. Items remaining in queue: [${remainingItemsSize}]`,
                'debug'
              );
              await this.batchHandler({ batch: this.batchCount, data: batchPage });
            } catch (err) {
              this.log(
                `batchHandler threw error (below). Will continue on to next batch page:\n${err}`,
                'debug'
              );
              // ignore errors in the batch page processing and keep going to process others.
              // callback should have handled errors that its process might throw
            }
          } else {
            hasMoreData = false;
          }
        } catch (err) {
          hasMoreData = false;
          throw err;
        }
      }
    };

    this.processingPromise = runThroughQueue().finally(() => {
      this.processingPromise = undefined;
    });

    return this.processingPromise;
  }

  /**
   * Adds an update to the queue
   */
  public addToQueue(...data: T[]) {
    if (data.length > 0) {
      this.queue.push(...data);
      this.processQueue();
    }
  }

  /**
   * Flushes the queue and awaits processing of all remaining updates.
   *
   * **IMPORTANT**: Always make sure `complete()` is called to ensure no items are left in the queue
   */
  public async complete(): Promise<void> {
    if (this.processingPromise) {
      await this.processingPromise.finally(() => {});
    }

    await this.processQueue(true);

    this.log(
      `Processed [${this.batchCount}] batches and a total of [${this.itemsProcessedCount}] items`,
      'debug'
    );
  }
}
