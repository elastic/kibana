/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import moment, { Moment } from 'moment';
import { isNumber, random, range } from 'lodash';
import { Config, EventsPerCycle, EventsPerCycleTransitionDefRT, ParsedSchedule } from '../types';
import { generateEvents } from '../data_sources';
import { createQueue } from './queue';
import { wait } from './wait';
import { isWeekendTraffic } from './is_weekend';
import { createExponentialFunction, createLinearFunction, createSineFunction } from './data_shapes';
import { QueueRegistry } from '../queue/queue_registry';

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

export async function createEvents({
  config,
  client,
  schedule,
  end,
  currentTimestamp,
  continueIndexing = false,
  logger,
  queueRegistry,
}: {
  config: Config;
  client: ElasticsearchClient;
  schedule: ParsedSchedule;
  end: Moment | false;
  currentTimestamp: Moment;
  continueIndexing: boolean;
  logger: Logger;
  queueRegistry: QueueRegistry;
}): Promise<void> {
  const queue = createQueue({ client, config, logger, queueRegistry });

  queueRegistry.registerQueue(queue);

  if (
    !queue.paused &&
    schedule.delayInMinutes &&
    schedule.delayEveryMinutes &&
    currentTimestamp.minute() % schedule.delayEveryMinutes === 0
  ) {
    logger.info('Pausing queue');
    queue.pause();
    setTimeout(() => {
      logger.info('Resuming queue');
      queue.resume();
    }, schedule.delayInMinutes * 60 * 1000);
  }

  const eventsPerCycle = schedule.eventsPerCycle ?? config.indexing.eventsPerCycle;
  const interval = schedule.interval ?? config.indexing.interval;
  const calculateEventsPerCycle = createEventsPerCycleFn(schedule, eventsPerCycle, logger);
  const totalEvents = calculateEventsPerCycle(currentTimestamp);

  if (totalEvents > 0) {
    let epc = schedule.randomness
      ? random(
          Math.round(totalEvents - totalEvents * schedule.randomness),
          Math.round(totalEvents + totalEvents * schedule.randomness)
        )
      : totalEvents;
    if (config.indexing.reduceWeekendTrafficBy && isWeekendTraffic(currentTimestamp)) {
      logger.info(
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
      .forEach((event) => queue.push(event));
    await queue.drain();
    queueRegistry.stopQueues();
  } else {
    logger.info('Indexing 0 documents. Took: 0, latency: 0, indexed: 0');
  }

  const endTs = end === false ? moment() : end;
  if (currentTimestamp.isBefore(endTs)) {
    return createEvents({
      client,
      config,
      schedule,
      end,
      currentTimestamp: currentTimestamp.add(interval, 'ms'),
      continueIndexing,
      logger,
      queueRegistry,
    });
  }
  if (currentTimestamp.isSameOrAfter(endTs) && continueIndexing) {
    await wait(interval, logger);
    return createEvents({
      client,
      config,
      schedule,
      end,
      currentTimestamp: currentTimestamp.add(interval, 'ms'),
      continueIndexing,
      logger,
      queueRegistry,
    });
  }
  logger.info(`Indexing complete for ${schedule.template} events.`);
}
