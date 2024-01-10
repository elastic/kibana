/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import axios from 'axios';
import * as rx from 'rxjs';

import type { Logger } from '@kbn/core/server';
import type { TelemetryPluginSetup } from '@kbn/telemetry-plugin/server';
import type { ITelemetryReceiver } from './receiver';
import {
  type ITelemetryEventsSenderV2,
  type QueueConfig,
  type RetryConfig,
  type TelemetryEventSenderConfig,
} from './sender_v2.types';
import { type TelemetryChannel } from './types';
import * as collections from './collections_helpers';
import { CachedSubject, retryOnError$ } from './rxjs_helpers';
import { SenderUtils } from './sender_helpers';
import { newTelemetryLogger, type TelemetryLogger } from './helpers';

export class TelemetryEventsSenderV2 implements ITelemetryEventsSenderV2 {
  private retryConfig: RetryConfig | undefined;
  private queues: Map<TelemetryChannel, QueueConfig> | undefined;

  private readonly events$ = new rx.Subject<Event>();

  private readonly finished$ = new rx.Subject<void>();
  private cache: CachedSubject<Event> | undefined;

  private status: ServiceStatus = ServiceStatus.CREATED;

  private readonly logger: TelemetryLogger;

  private senderUtils: SenderUtils | undefined;

  constructor(logger: Logger) {
    this.logger = newTelemetryLogger(logger.get('telemetry_events'));
  }

  public setup(
    config: TelemetryEventSenderConfig,
    telemetryReceiver: ITelemetryReceiver,
    telemetrySetup?: TelemetryPluginSetup
  ): void {
    this.ensureStatus(ServiceStatus.CREATED);

    this.retryConfig = config.retryConfig;
    this.queues = config.queues;
    this.cache = new CachedSubject<Event>(this.events$);

    this.senderUtils = new SenderUtils(telemetrySetup, telemetryReceiver);

    this.updateStatus(ServiceStatus.CONFIGURED);
  }

  public start(): void {
    this.ensureStatus(ServiceStatus.CONFIGURED);

    this.cache?.stop();
    this.events$
      .pipe(
        rx.connect((shared$) => {
          const queues$ = [...this.getQueues().keys()].map((channel) =>
            this.queue$(shared$, channel)
          );
          return rx.merge(...queues$);
        })
      )
      .subscribe({
        next: (result: Result) => {
          // TODO(sebastian.zaffarano): increment telemetry usage counter
          if (isFailure(result)) {
            this.logger.l(
              `Failure! unable to send ${result} events to channel "${result.channel}"`
            );
          } else {
            this.logger.l(`Success! %d events sent to channel "${result.channel}"`);
          }
        },
        error: (err) => {
          this.logger.l(`Unexpected error: "${err}"`);
        },
        complete: () => {
          this.logger.l('Shutting down');
          this.finished$.next();
        },
      });

    this.cache?.flush();
    this.updateStatus(ServiceStatus.STARTED);
  }

  public async stop(): Promise<void> {
    this.ensureStatus(ServiceStatus.STARTED);

    const finishPromise = rx.firstValueFrom(this.finished$);
    this.events$.complete();
    this.cache?.stop();
    await finishPromise;

    this.updateStatus(ServiceStatus.CONFIGURED);
  }

  public send(channel: TelemetryChannel, events: unknown[]): void {
    this.ensureStatus(ServiceStatus.CONFIGURED, ServiceStatus.STARTED);

    if (!this.existsQueueConfig(channel)) {
      throw new Error(`${channel}: channel not configured`);
    }

    events.forEach((event) => {
      this.events$.next({ channel, payload: event });
    });
  }

  public updateConfig(channel: TelemetryChannel, config: QueueConfig): void {
    if (!this.getQueues().has(channel)) {
      throw new Error(`Channel "${channel}" was not configured`);
    }

    this.getQueues().set(channel, config);
  }

  // internal methods
  private queue$(
    upstream$: rx.Observable<Event>,
    channel: TelemetryChannel
  ): rx.Observable<Result> {
    let inflightEventsCounter: number = 0;
    const inflightEvents$: rx.Subject<number> = new rx.Subject<number>();

    inflightEvents$.subscribe((value) => (inflightEventsCounter += value));

    return upstream$.pipe(
      // only take events for the configured channel
      rx.filter((event) => event.channel === channel),

      rx.switchMap((event) => {
        if (inflightEventsCounter < this.getConfigFor(channel).inflightEventsThreshold) {
          return rx.of(event);
        }
        this.logger.l(
          `>> Dropping event ${event} (channel: ${channel}, inflightEventsCounter: ${inflightEventsCounter})`
        );
        return rx.EMPTY;
      }),

      // update inflight events counter
      rx.tap(() => {
        inflightEvents$.next(1);
      }),

      // buffer events for a while
      rx.bufferWhen<Event>(() => rx.interval(this.getConfigFor(channel).bufferTimeSpanMillis)),

      // exclude empty buffers
      rx.filter((n: Event[]) => n.length > 0),

      // serialize the payloads
      // TODO(sebastian.zaffarano): configure serializer (e.g. protobuf)
      rx.map((events) => events.map((e) => JSON.stringify(e.payload))),

      // chunk by size
      rx.map((values) =>
        collections
          .chunkedBy(
            values,
            this.getConfigFor(channel).maxPayloadSizeBytes,
            (payload) => payload.length
          )
          .map((chunk) => {
            const c: Chunk = { channel, payloads: chunk };
            return c;
          })
      ),
      rx.concatAll(),

      // send events to the telemetry server
      rx.concatMap((chunk: Chunk) =>
        retryOnError$(
          this.getRetryConfig().retryCount,
          this.getRetryConfig().retryDelayMillis,
          async () => this.sendEvents(channel, chunk.payloads)
        )
      ),

      // update inflight events counter
      rx.tap((result: Result) => {
        inflightEvents$.next(-result.events);
      })
    ) as rx.Observable<Result>;
  }

  private async getSenderMetadata(channel: TelemetryChannel) {
    if (this.senderUtils === undefined) throw new Error('Service not initialized');
    return this.senderUtils?.fetchSenderMetadata(channel);
  }

  // TODO(sebastian.zaffarano): not fully implemented yet
  private async sendEvents(channel: TelemetryChannel, events: string[]): Promise<Result> {
    const senderMetadata = await this.getSenderMetadata(channel);

    try {
      this.logger.l(`Sending ${events.length} telemetry events to ${channel}`);

      const body = events.join('\n');

      const telemetryUrl = senderMetadata.telemetryUrl;

      // TODO(sebastian.zaffarano): When send events to `alerts-endpoint` using
      // `sender.queueEvents`, it adds cluster and license information to the event:
      // ...(licenseInfo ? { license: this.receiver?.copyLicenseFields(licenseInfo) } : {}),
      // cluster_uuid: clusterInfo?.cluster_uuid,
      // cluster_name: clusterInfo?.cluster_name,
      // do we need to do it? diagnostic.ts also sends to the same channel, but
      // using `sendOnDemand` and hence it doesn't enrich the original-body

      return await axios
        .post(telemetryUrl, body, {
          headers: senderMetadata.telemetryRequestHeaders(),
          timeout: 10000,
        })
        .then((r) => {
          if (r.status < 400) {
            return { events: events.length, channel };
          } else {
            this.logger.l(`Unexpected response, got ${r.status}`);
            throw newFailure(`Got ${r.status}`, channel, events.length);
          }
        })
        .catch((err) => {
          this.logger.l(`Runtime error: ${err.message}`);
          throw newFailure(`Error posting events: ${err}`, channel, events.length);
        });
    } catch (err: unknown) {
      throw newFailure(`Unexpected error posting events: ${err}`, channel, events.length);
    }
  }

  private getQueues(): Map<TelemetryChannel, QueueConfig> {
    if (this.queues === undefined) throw new Error('Service not initialized');
    return this.queues;
  }

  private getConfigFor(channel: TelemetryChannel): QueueConfig {
    const config = this.queues?.get(channel);
    if (config === undefined) throw new Error(`No queue config found for channel "${channel}"`);
    return config;
  }

  private getRetryConfig(): RetryConfig {
    if (this.retryConfig === undefined) throw new Error('Service not initialized');
    return this.retryConfig;
  }

  private existsQueueConfig(channel: TelemetryChannel): boolean {
    return this.getQueues().has(channel);
  }

  private ensureStatus(...expected: ServiceStatus[]): void {
    if (!expected.includes(this.status)) {
      throw new Error(`${this.status}: invalid status. Expected [${expected.join(',')}]`);
    }
  }

  private updateStatus(newStatus: ServiceStatus): void {
    this.status = newStatus;
  }
}

function newFailure(message: string, channel: TelemetryChannel, events: number): Failure {
  const failure: Failure = { name: 'Failure', message, channel, events };
  return failure;
}

function isFailure(result: Result): result is Failure {
  return 'name' in result && 'message' in result && 'events' in result && 'channel' in result;
}

interface Chunk {
  channel: TelemetryChannel;
  payloads: string[];
}

interface Event {
  channel: TelemetryChannel;
  payload: unknown;
}

type Result = Success | Failure;

interface Success {
  events: number;
  channel: TelemetryChannel;
}

interface Failure extends Error {
  events: number;
  channel: TelemetryChannel;
}

export enum ServiceStatus {
  CREATED = 'CREATED',
  CONFIGURED = 'CONFIGURED',
  STARTED = 'STARTED',
}
