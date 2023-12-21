/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesConnectorError } from './cases_connector_error';
import type { BackoffStrategy, BackoffFactory } from './types';

export class CaseConnectorRetryService {
  private maxAttempts: number = 10;
  /**
   * 409 - Conflict
   * 429 - Too Many Requests
   * 503 - ES Unavailable
   *
   * Full list of errors: packages/core/saved-objects/core-saved-objects-server/src/saved_objects_error_helpers.ts
   */
  private readonly RETRY_STATUS_CODES: number[] = [409, 429, 503];
  private readonly backOffStrategy: BackoffStrategy;

  private timer: NodeJS.Timeout | null = null;
  private attempt: number = 0;

  constructor(backOffFactory: BackoffFactory, maxAttempts: number = 10) {
    this.backOffStrategy = backOffFactory.create();
    this.maxAttempts = maxAttempts;
  }

  public async retryWithBackoff<T>(cb: () => Promise<T>): Promise<T> {
    try {
      const res = await cb();
      return res;
    } catch (error) {
      if (this.shouldRetry() && this.isRetryableError(error)) {
        this.stop();
        this.attempt++;

        await this.delay();
        return this.retryWithBackoff(cb);
      }

      throw error;
    }
  }

  private shouldRetry() {
    return this.attempt < this.maxAttempts;
  }

  private isRetryableError(error: Error) {
    if (
      error instanceof CasesConnectorError &&
      this.RETRY_STATUS_CODES.includes(error.statusCode)
    ) {
      return true;
    }

    return false;
  }

  private async delay() {
    const ms = this.backOffStrategy.nextBackOff();

    return new Promise((resolve) => {
      this.timer = setTimeout(resolve, ms);
    });
  }

  private stop(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
