/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import moment, { Moment } from 'moment';
import { isNumber, random, range } from 'lodash';
import { QueueObject } from 'async';
import { Doc } from '../../common/types';
import { Config, EventsPerCycle, EventsPerCycleTransitionDefRT, ParsedSchedule } from '../types';
import { generateEvents } from '../data_sources';
import { createQueue } from './queue';
import { wait } from './wait';
import { isWeekendTraffic } from './is_weekend';
import { createExponentialFunction, createLinearFunction, createSineFunction } from './data_shapes';

function createEventsPerCycleFn(
  schedule: ParsedSchedule,
  eventsPerCycle: EventsPerCycle,
  logger: Logger
): (timestamp: Moment) => number {
  if (EventsPerCycleTransitionDefRT.is(eventsPerCycle) && isNumber(schedule.end)) {
    const startPoint = { x: schedule.start, y: eventsPerCycle.start };
    const endPoint = { x: schedule.end, y: eventsPerCycle.end };

    if (eventsPerCycle.method === 'exp') {
      return createExponentialFunction(startPoint, endPoint);
    }

    if (eventsPerCycle.method === 'sine') {
      return createSineFunction(startPoint, endPoint, eventsPerCycle.options?.period ?? 60);
    }

    return createLinearFunction(startPoint, endPoint);
  } else if (EventsPerCycleTransitionDefRT.is(eventsPerCycle) && schedule.end === false) {
    logger.warn('EventsPerCycle must be a number if the end value of schedule is false.');
  }

  return (_timestamp: Moment) =>
    EventsPerCycleTransitionDefRT.is(eventsPerCycle) ? eventsPerCycle.end : eventsPerCycle;
}

export class CreateEvents {
  private client: ElasticsearchClient | undefined;
  private logger: Logger | undefined;
  private config: Config | undefined;
  private schedule: ParsedSchedule | undefined;
  private currentTimestamp: Moment | undefined;

  private paused: boolean | undefined = false;
  private queue: QueueObject<Doc> | undefined = undefined;

  constructor({ client, logger }: { client: ElasticsearchClient; logger: Logger }) {
    this.client = client;
    this.logger = logger;
  }
  pause() {
    if (
      this.queue &&
      !this.paused &&
      this.schedule?.delayInMinutes &&
      this.schedule?.delayEveryMinutes &&
      this.currentTimestamp &&
      this.currentTimestamp.minute() % this.schedule.delayEveryMinutes === 0
    ) {
      this.logger?.info('Pausing queue');

      this.queue.pause();

      setTimeout(() => {
        this.logger?.info('Resuming queue');
        this.queue?.resume();
      }, this.schedule.delayInMinutes * 60 * 1000);
    }
  }

  async start({
    config,
    schedule,
    end,
    currentTimestamp,
    continueIndexing,
  }: {
    config: Config;
    schedule: ParsedSchedule;
    end: Moment | false;
    currentTimestamp: Moment;
    continueIndexing: boolean;
  }) {
    this.config = config;
    this.schedule = schedule;
    this.currentTimestamp = currentTimestamp;
    this.queue = createQueue({ client: this.client!, config, logger: this.logger! });

    const eventsPerCycle = this.schedule.eventsPerCycle ?? this.config.indexing.eventsPerCycle;
    const interval = this.schedule.interval ?? this.config.indexing.interval;
    const calculateEventsPerCycle = createEventsPerCycleFn(
      this.schedule,
      eventsPerCycle,
      this.logger!
    );
    const totalEvents = calculateEventsPerCycle(currentTimestamp);

    if (totalEvents > 0) {
      let epc = schedule.randomness
        ? random(
            Math.round(totalEvents - totalEvents * schedule.randomness),
            Math.round(totalEvents + totalEvents * schedule.randomness)
          )
        : totalEvents;

      if (config.indexing.reduceWeekendTrafficBy && isWeekendTraffic(currentTimestamp)) {
        this.logger?.info(
          `Reducing traffic from ${epc} to ${epc * (1 - config.indexing.reduceWeekendTrafficBy)}`
        );
        epc = epc * (1 - config.indexing.reduceWeekendTrafficBy);
      }

      range(epc)
        .map((i) => {
          const generateEvent = generateEvents[config.indexing.dataset] || generateEvents.fake_logs;

          const eventTimestamp = moment(
            random(currentTimestamp.valueOf(), currentTimestamp.valueOf() + interval)
          );

          return generateEvent(config, schedule, i, eventTimestamp);
        })
        .flat()
        .forEach((event) => this.queue?.push(event));

      await this.queue.drain();
    } else {
      this.logger?.info('Indexing 0 documents. Took: 0, latency: 0, indexed: 0');
    }

    const endTs = end === false ? moment() : end;

    if (currentTimestamp.isBefore(endTs)) {
      this.start({
        config,
        schedule,
        end,
        currentTimestamp: currentTimestamp.add(interval, 'ms'),
        continueIndexing,
      });
    }

    if (currentTimestamp.isSameOrAfter(endTs) && continueIndexing && this.logger) {
      await wait(interval, this.logger);

      this.start({
        config,
        schedule,
        end,
        currentTimestamp: currentTimestamp.add(interval, 'ms'),
        continueIndexing,
      });
    }

    this.logger?.info(`Indexing complete for ${schedule.template} events.`);
  }

  stop() {
    this.queue?.kill();
    this.queue = undefined;

    this.client = undefined;
    this.logger = undefined;

    this.config = undefined;
    this.schedule = undefined;
    this.currentTimestamp = undefined;

    this.paused = undefined;
    this.queue = undefined;
  }
}
