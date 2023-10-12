/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment, { Moment } from 'moment';
import { isNumber, isString } from 'lodash';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Config, ParsedSchedule, Schedule } from '../types';
import { JobRegistry } from '../jobs/job_registry';

// Fake parser, add a real one
const parser = {
  parse: (time: string, now: Moment, isEnd: boolean) => {
    if (time === 'false') return false;

    if (isEnd) {
      const timeValueWithoutUnit = Number(time.replace('m', ''));
      return now.add(timeValueWithoutUnit, 'minutes').valueOf();
    }
    return now.valueOf();
  },
};

// Needs work!
const parseSchedule =
  (now: Moment) =>
  (schedule: Schedule): ParsedSchedule => {
    const startTs = isNumber(schedule.start)
      ? schedule.start
      : parser.parse(schedule.start, now, false);

    const endTs = isNumber(schedule.end)
      ? schedule.end
      : isString(schedule.end)
      ? parser.parse(schedule.end, now, true)
      : false;

    return { ...schedule, start: startTs as number, end: endTs };
  };

export async function indexSchedule({
  client,
  config,
  logger,
  jobRegistry,
}: {
  client: ElasticsearchClient;
  config: Config;
  logger: Logger;
  jobRegistry: JobRegistry;
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

    jobRegistry.start({
      client,
      config,
      schedule,
      end,
      currentTimestamp: startTs.clone().add(interval, 'ms'),
      continueIndexing: schedule.end === false,
      logger,
    });
  }
}
