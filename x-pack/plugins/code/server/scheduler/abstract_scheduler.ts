/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Repository } from '../../model';
import { RepositoryIndexNamePrefix, RepositoryReservedField } from '../indexer/schema';
import { EsClient } from '../lib/esqueue';
import { Poller } from '../poller';

export abstract class AbstractScheduler {
  private poller: Poller;

  constructor(
    protected readonly client: EsClient,
    pollFrequencyMs: number,
    protected readonly onScheduleFinished?: () => void
  ) {
    this.poller = new Poller({
      functionToPoll: () => {
        return this.schedule();
      },
      pollFrequencyInMillis: pollFrequencyMs,
      trailing: true,
      continuePollingOnError: true,
      pollFrequencyErrorMultiplier: 2,
    });
  }

  public start() {
    this.poller.start();
  }

  public stop() {
    this.poller.stop();
  }

  protected async schedule(): Promise<void> {
    const res = await this.client.search({
      index: `${RepositoryIndexNamePrefix}*`,
      body: {
        query: {
          exists: {
            field: RepositoryReservedField,
          },
        },
      },
      from: 0,
      size: 10000,
    });
    const schedulingPromises = Array.from(res.hits.hits).map((hit: any) => {
      const repo: Repository = hit._source[RepositoryReservedField];
      return this.executeSchedulingJob(repo);
    });
    await Promise.all(schedulingPromises);
    // Execute the callback after each schedule is done.
    if (this.onScheduleFinished) {
      this.onScheduleFinished();
    }
  }

  protected repoNextSchedulingTime(): Date {
    const duration =
      this.getRepoSchedulingFrequencyMs() / 2 +
      ((Math.random() * Number.MAX_SAFE_INTEGER) % this.getRepoSchedulingFrequencyMs());
    const now = new Date().getTime();
    return new Date(now + duration);
  }

  protected getRepoSchedulingFrequencyMs() {
    // This is an abstract class. Do nothing here. You should override this.
    return -1;
  }

  protected async executeSchedulingJob(repo: Repository) {
    // This is an abstract class. Do nothing here. You should override this.
    return new Promise<any>((resolve, _) => {
      resolve();
    });
  }
}
