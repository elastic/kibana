/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { concatMap, filter, firstValueFrom, from, merge, Subject, takeWhile, timer } from 'rxjs';
import type { AnalyticsClientInitContext, Event } from '@kbn/analytics-client';
import {
  ElasticV3ServerShipper,
  ElasticV3ShipperOptions,
} from '@kbn/analytics-shippers-elastic-v3-server';
import { TELEMETRY_MAX_BUFFER_SIZE } from './constants';

export class SecuritySolutionCustomShipper extends ElasticV3ServerShipper {
  public static readonly shipperName = 'security_solution_shipper';

  private optedIn?: boolean;
  private readonly stop$ = new Subject<void>();

  private readonly initialCheckDelayMs = 10 * 1000;
  private readonly checkIntervalMs = 60 * 1000;

  private maxQueueSize = TELEMETRY_MAX_BUFFER_SIZE;
  private queue: Event[] = [];

  constructor(
    options: ElasticV3ShipperOptions,
    private readonly context: AnalyticsClientInitContext
  ) {
    super(options, context);
    this.setSubscriber();
  }

  public optIn(isOptedIn: boolean) {
    this.optedIn = isOptedIn;

    if (isOptedIn === false) {
      this.queue.length = 0;
    }
  }

  public reportEvents(events: Event[]) {
    if (this.optedIn === false) {
      return;
    }

    const qLength = this.queue.length;

    this.context.logger.debug('Queue events');
    if (events.length > this.maxQueueSize - qLength) {
      this.queue.push(...events.slice(0, this.maxQueueSize - qLength));
    } else {
      this.queue.push(...events);
    }
  }

  public shutdown() {
    this.stop$.complete();
  }

  private setSubscriber() {
    merge(
      timer(this.initialCheckDelayMs, this.checkIntervalMs),
      // Using a promise because complete does not emit through the pipe.
      from(firstValueFrom(this.stop$, { defaultValue: true }))
    ).pipe(
      // Only move ahead if it's opted-in & have something to send.
      filter(() => this.optedIn === true && this.queue.length > 0),

      // Send the events
      concatMap(async () => {
        // Calling the original shipper's send events method.
        // Its queueing/leaky-bucket logic is done before this one so calling this sends the events for us.
        await this.sendEvents(this.queue.splice(0, this.queue.length));
      }),

      // Stop the subscriber if we are shutting down.
      takeWhile(() => !this.stop$.isStopped)
    );
  }
}
