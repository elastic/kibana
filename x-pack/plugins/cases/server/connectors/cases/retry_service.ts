/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { CasesConnectorError } from './cases_connector_error';
import type { BackoffStrategy, BackoffFactory } from './types';

export class CaseConnectorRetryService {
  private logger: Logger;
  private maxAttempts: number;
  /**
   * 409 - Conflict
   * 429 - Too Many Requests
   * 503 - ES Unavailable
   *
   * Full list of errors: packages/core/saved-objects/core-saved-objects-server/src/saved_objects_error_helpers.ts
   */
  private readonly RETRY_ERROR_STATUS_CODES: number[] = [409, 429, 503];
  private readonly backOffStrategy: BackoffStrategy;

  private timer: NodeJS.Timeout | null = null;
  private attempt: number = 0;

  constructor(logger: Logger, backOffFactory: BackoffFactory, maxAttempts: number = 10) {
    this.logger = logger;
    this.backOffStrategy = backOffFactory.create();
    this.maxAttempts = maxAttempts;
  }

  public async retryWithBackoff<T>(cb: () => Promise<T>): Promise<T> {
    try {
      this.logger.debug(
        `[CasesConnector][retryWithBackoff] Running case connector. Attempt: ${this.attempt}`,
        {
          labels: { attempt: this.attempt },
          tags: ['case-connector:retry-start'],
        }
      );

      const res = await cb();

      this.logger.debug(
        `[CasesConnector][retryWithBackoff] Case connector run successfully after ${this.attempt} attempts`,
        {
          labels: { attempt: this.attempt },
          tags: ['case-connector:retry-success'],
        }
      );

      return res;
    } catch (error) {
      if (this.shouldRetry() && this.isRetryableError(error)) {
        this.stop();
        this.attempt++;

        await this.delay();

        this.logger.warn(
          `[CaseConnector] Case connector failed with status code ${error.statusCode}. Attempt for retry: ${this.attempt}`
        );

        return this.retryWithBackoff(cb);
      }

      throw error;
    } finally {
      this.logger.debug(
        `[CasesConnector][retryWithBackoff] Case connector run ended after ${this.attempt} attempts`,
        {
          labels: { attempt: this.attempt },
          tags: ['case-connector:retry-end'],
        }
      );
    }
  }

  private shouldRetry() {
    return this.attempt < this.maxAttempts;
  }

  private isRetryableError(error: Error) {
    if (
      error instanceof CasesConnectorError &&
      this.RETRY_ERROR_STATUS_CODES.includes(error.statusCode)
    ) {
      return true;
    }

    this.logger.debug(`[CasesConnector][isRetryableError] Error is not retryable`, {
      tags: ['case-connector:retry-error'],
    });

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
