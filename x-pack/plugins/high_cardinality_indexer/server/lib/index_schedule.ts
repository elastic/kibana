/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment, { Moment } from 'moment';
import { isNumber, isString } from 'lodash';
// import parser from 'datemath-parse'; // need a replacement library
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Config, ParsedSchedule, Schedule } from '../types';
import { createEvents } from './create_events';
import { QueueRegistry } from '../queue/queue_registry';

const parser = { parse: () => {} };

// Needs work!
const parseSchedule =
  (now: Moment) =>
  (schedule: Schedule): ParsedSchedule => {
    const startTs = isNumber(schedule.start)
      ? schedule.start
      : parser.parse(schedule.start, now.valueOf(), false);

    const endTs = isNumber(schedule.end)
      ? schedule.end
      : isString(schedule.end)
      ? parser.parse(schedule.end, now.valueOf(), true)
      : false;

    return { ...schedule, start: startTs, end: endTs };
  };

export async function indexSchedule({
  client,
  config,
  logger,
  queueRegistry,
}: {
  client: ElasticsearchClient;
  config: Config;
  logger: Logger;
  queueRegistry: QueueRegistry;
}) {
  const now = moment();
  const compiledSchedule = config.schedule.map(parseSchedule(now));

  for (const schedule of compiledSchedule) {
    const interval = schedule.interval ?? config.indexing.interval;

    const startTs = moment(schedule.start);
    const end =
      schedule.end === false && startTs.isAfter(now)
        ? moment(schedule.start + interval)
        : isNumber(schedule.end)
        ? moment(schedule.end)
        : false;

    // We add one interval to the start to prevent overlap with the previous schedule.
    if (end !== false && end.isBefore(startTs)) {
      const errorMessage = `Start (${startTs.toISOString()} must come before the end (${end.toISOString()}))`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    logger.info(
      `Indexing "${schedule.template}" events from ${startTs.toISOString()} to ${
        end === false ? 'indefinitely' : end.toISOString()
      }`
    );

    await createEvents({
      client,
      config,
      schedule,
      end,
      currentTimestamp: startTs.clone().add(interval, 'ms'),
      continueIndexing: schedule.end === false,
      logger,
      queueRegistry,
    });
  }
}
