/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import axios from 'axios';
import * as rx from 'rxjs';
import _, { cloneDeep } from 'lodash';

import type { Logger } from '@kbn/core/server';
import type { TelemetryPluginSetup, TelemetryPluginStart } from '@kbn/telemetry-plugin/server';
import { type IUsageCounter } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counter';
import type { ITelemetryReceiver } from './receiver';
import {
  type IAsyncTelemetryEventsSender,
  type QueueConfig,
  type RetryConfig,
} from './async_sender.types';
import { TelemetryChannel, TelemetryCounter } from './types';
import * as collections from './collections_helpers';
import { CachedSubject, retryOnError$ } from './rxjs_helpers';
import { SenderUtils } from './sender_helpers';
import { newTelemetryLogger } from './helpers';
import { type TelemetryLogger } from './telemetry_logger';

export const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  bufferTimeSpanMillis: 30 * 1_000,
  inflightEventsThreshold: 1_000,
  maxPayloadSizeBytes: 1024 * 1024, // 1MiB
};
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  retryCount: 3,
  retryDelayMillis: 1000,
};

export class AsyncTelemetryEventsSender implements IAsyncTelemetryEventsSender {
  private retryConfig: RetryConfig | undefined;
  private fallbackQueueConfig: QueueConfig | undefined;
  private queues: Map<TelemetryChannel, QueueConfig> | undefined;

  private readonly flush$ = new rx.Subject<void>();

  private readonly events$ = new rx.Subject<Event>();

  private readonly finished$ = new rx.Subject<void>();
  private cache: CachedSubject<Event> | undefined;

  private status: ServiceStatus = ServiceStatus.CREATED;

  private readonly logger: TelemetryLogger;

  private telemetryReceiver?: ITelemetryReceiver;
  private telemetrySetup?: TelemetryPluginSetup;
  private telemetryUsageCounter?: IUsageCounter;
  private senderUtils: SenderUtils | undefined;

  constructor(logger: Logger) {
    this.logger = newTelemetryLogger(logger.get('telemetry_events.async_sender'));
  }

  public setup(
    retryConfig: RetryConfig,
    fallbackQueueConfig: QueueConfig,
    telemetryReceiver: ITelemetryReceiver,
    telemetrySetup?: TelemetryPluginSetup,
    telemetryUsageCounter?: IUsageCounter
  ): void {
    this.logger.l(`Setting up ${AsyncTelemetryEventsSender.name}`);

    this.ensureStatus(ServiceStatus.CREATED);

    this.retryConfig = retryConfig;
    this.fallbackQueueConfig = fallbackQueueConfig;
    this.queues = new Map<TelemetryChannel, QueueConfig>();
    this.cache = new CachedSubject<Event>(this.events$);
    this.telemetryReceiver = telemetryReceiver;
    this.telemetrySetup = telemetrySetup;
    this.telemetryUsageCounter = telemetryUsageCounter;

    this.updateStatus(ServiceStatus.CONFIGURED);
  }

  public start(telemetryStart?: TelemetryPluginStart): void {
    this.logger.l(`Starting ${AsyncTelemetryEventsSender.name}`);

    this.ensureStatus(ServiceStatus.CONFIGURED);

    this.senderUtils = new SenderUtils(
      this.telemetrySetup,
      telemetryStart,
      this.telemetryReceiver,
      this.telemetryUsageCounter
    );

    this.cache?.stop();
    this.events$
      .pipe(
        rx.connect((shared$) => {
          const queues$ = Object.values(TelemetryChannel).map((channel) =>
            this.queue$(shared$, channel, this.sendEvents.bind(this))
          );
          return rx.merge(...queues$);
        })
      )
      .subscribe({
        next: (result: Result) => {
          if (isFailure(result)) {
            this.logger.l(
              `Failure! unable to send ${result.events} events to channel "${result.channel}": ${result.message}`
            );
            this.senderUtils?.incrementCounter(
              TelemetryCounter.DOCS_LOST,
              result.events,
              result.channel
            );
          } else {
            this.logger.l(`Success! ${result.events} events sent to channel "${result.channel}"`);
            this.senderUtils?.incrementCounter(
              TelemetryCounter.DOCS_SENT,
              result.events,
              result.channel
            );
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
    this.logger.l(`Stopping ${AsyncTelemetryEventsSender.name}`);

    this.ensureStatus(ServiceStatus.CONFIGURED, ServiceStatus.STARTED);

    const finishPromise = rx.firstValueFrom(this.finished$);
    this.events$.complete();
    this.cache?.stop();
    await finishPromise;

    this.updateStatus(ServiceStatus.CONFIGURED);
  }

  public send(channel: TelemetryChannel, events: unknown[]): void {
    this.ensureStatus(ServiceStatus.CONFIGURED, ServiceStatus.STARTED);

    events.forEach((event) => {
      this.events$.next({ channel, payload: event });
    });
  }

  public simulateSend(channel: TelemetryChannel, events: unknown[]): string[] {
    const payloads: string[] = [];

    const localEvents$: rx.Observable<Event> = rx.of(
      ...events.map((e) => {
        return { channel, payload: e };
      })
    );

    const localSubscription$ = this.queue$(localEvents$, channel, (_ch, p) => {
      const result = { events: events.length, channel };
      payloads.push(...p);
      return Promise.resolve(result);
    }).subscribe();

    localSubscription$.unsubscribe();

    return payloads;
  }

  public updateQueueConfig(channel: TelemetryChannel, config: QueueConfig): void {
    const currentConfig = this.getQueues().get(channel);
    if (!_.isEqual(config, currentConfig)) {
      this.getQueues().set(channel, cloneDeep(config));
      // flush the queues to get the new configuration asap
      this.flush$.next();
    }
  }

  public updateDefaultQueueConfig(config: QueueConfig): void {
    if (!_.isEqual(config, this.fallbackQueueConfig)) {
      this.fallbackQueueConfig = cloneDeep(config);
      // flush the queues to get the new configuration asap
      this.flush$.next();
    }
  }

  // internal methods
  private queue$(
    upstream$: rx.Observable<Event>,
    channel: TelemetryChannel,
    send: (channel: TelemetryChannel, events: string[]) => Promise<Result>
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
        this.senderUtils?.incrementCounter(TelemetryCounter.DOCS_DROPPED, 1, channel);

        return rx.EMPTY;
      }),

      // update inflight events counter
      rx.tap(() => {
        inflightEvents$.next(1);
      }),

      // buffer events for a while or after a flush$ event is sent (see updateConfig)
      rx.bufferWhen<Event>(() =>
        rx.merge(rx.interval(this.getConfigFor(channel).bufferTimeSpanMillis), this.flush$)
      ),

      // exclude empty buffers
      rx.filter((n: Event[]) => n.length > 0),

      // enrich the events
      rx.map((events) => events.map((e) => this.enrich(e))),

      // serialize the payloads
      rx.map((events) => events.map((e) => this.serialize(e))),

      // chunk by size
      rx.map((values) =>
        collections.chunkedBy(
          values,
          this.getConfigFor(channel).maxPayloadSizeBytes,
          (payload) => payload.length
        )
      ),
      rx.concatAll(),

      // send events to the telemetry server
      rx.concatMap((payloads: string[]) =>
        retryOnError$(
          this.getRetryConfig().retryCount,
          this.getRetryConfig().retryDelayMillis,
          async () => send(channel, payloads)
        )
      ),

      // update inflight events counter
      rx.tap((result: Result) => {
        inflightEvents$.next(-result.events);
      })
    ) as rx.Observable<Result>;
  }

  private enrich(event: Event): Event {
    const clusterInfo = this.telemetryReceiver?.getClusterInfo();

    // TODO(szaffarano): generalize the enrichment at channel level to not hardcode the logic here
    if (typeof event.payload === 'object') {
      let additional = {};

      if (event.channel !== TelemetryChannel.TASK_METRICS) {
        additional = {
          cluster_name: clusterInfo?.cluster_name,
          cluster_uuid: clusterInfo?.cluster_uuid,
        };
      } else {
        additional = {
          cluster_uuid: clusterInfo?.cluster_uuid,
        };
      }

      event.payload = {
        ...event.payload,
        ...additional,
      };
    }

    return event;
  }

  private serialize(event: Event): string {
    return JSON.stringify(event.payload);
  }

  private async sendEvents(channel: TelemetryChannel, events: string[]): Promise<Result> {
    this.logger.l(`Sending ${events.length} telemetry events to channel "${channel}"`);

    try {
      const senderMetadata = await this.getSenderMetadata(channel);

      const isTelemetryOptedIn = await senderMetadata.isTelemetryOptedIn();
      if (!isTelemetryOptedIn) {
        this.senderUtils?.incrementCounter(
          TelemetryCounter.TELEMETRY_OPTED_OUT,
          events.length,
          channel
        );

        this.logger.l(`Unable to send events to channel "${channel}": Telemetry is not opted-in.`);
        throw newFailure('Telemetry is not opted-in', channel, events.length);
      }

      const isElasticTelemetryReachable = await senderMetadata.isTelemetryServicesReachable();
      if (!isElasticTelemetryReachable) {
        this.logger.l('Telemetry Services are not reachable.');
        this.senderUtils?.incrementCounter(
          TelemetryCounter.TELEMETRY_NOT_REACHABLE,
          events.length,
          channel
        );

        this.logger.l(
          `Unable to send events to channel "${channel}": Telemetry services are not reachable.`
        );
        throw newFailure('Telemetry Services are not reachable', channel, events.length);
      }

      const body = events.join('\n');

      const telemetryUrl = senderMetadata.telemetryUrl;

      return await axios
        .post(telemetryUrl, body, {
          headers: {
            ...senderMetadata.telemetryRequestHeaders(),
            'X-Telemetry-Sender': 'async',
          },
          timeout: 10000,
        })
        .then((r) => {
          this.senderUtils?.incrementCounter(
            TelemetryCounter.HTTP_STATUS,
            events.length,
            channel,
            r.status.toString()
          );

          if (r.status < 400) {
            return { events: events.length, channel };
          } else {
            this.logger.l(`Unexpected response, got ${r.status}`);
            throw newFailure(`Got ${r.status}`, channel, events.length);
          }
        })
        .catch((err) => {
          this.senderUtils?.incrementCounter(
            TelemetryCounter.RUNTIME_ERROR,
            events.length,
            channel
          );

          this.logger.l(`Runtime error: ${err.message}`);
          throw newFailure(`Error posting events: ${err}`, channel, events.length);
        });
    } catch (err: unknown) {
      if (isFailure(err)) {
        throw err;
      } else {
        this.senderUtils?.incrementCounter(TelemetryCounter.FATAL_ERROR, events.length, channel);
        throw newFailure(`Unexpected error posting events: ${err}`, channel, events.length);
      }
    }
  }

  private getQueues(): Map<TelemetryChannel, QueueConfig> {
    if (this.queues === undefined) throw new Error('Service not initialized');
    return this.queues;
  }

  private getConfigFor(channel: TelemetryChannel): QueueConfig {
    const config = this.queues?.get(channel) ?? this.fallbackQueueConfig;
    if (config === undefined) throw new Error(`No queue config found for channel "${channel}"`);
    return config;
  }

  private async getSenderMetadata(channel: TelemetryChannel) {
    if (this.senderUtils === undefined) throw new Error('Service not initialized');
    return this.senderUtils?.fetchSenderMetadata(channel);
  }

  private getRetryConfig(): RetryConfig {
    if (this.retryConfig === undefined) throw new Error('Service not initialized');
    return this.retryConfig;
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

function isFailure(result: unknown): result is Failure {
  return (
    result !== null &&
    typeof result === 'object' &&
    'name' in result &&
    'message' in result &&
    'events' in result &&
    'channel' in result
  );
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
