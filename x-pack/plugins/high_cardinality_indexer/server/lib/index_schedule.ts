import moment, { Moment } from 'moment';
import parser from 'datemath-parser';
import type { Config, ParsedSchedule, Schedule } from '../types';
import { isNumber, isString } from 'lodash';
import { createEvents } from './create_events';
import { logger } from './logger';

const parseSchedule = (now: Moment) => (schedule: Schedule): ParsedSchedule => {
  const startTs = isNumber(schedule.start)
    ? schedule.start
    : parser.parse(schedule.start, now.valueOf(), false);
  const endTs = isNumber(schedule.end)
    ? schedule.end : isString(schedule.end)
    ? parser.parse(schedule.end, now.valueOf(), true)
    : false;
  return { ...schedule, start: startTs, end: endTs };
};

export async function indexSchedule(config: Config) {
  const now = moment();
  const compiledSchedule = config.schedule.map(parseSchedule(now));
  for(const schedule of compiledSchedule) {
    const interval = schedule.interval ?? config.indexing.interval;
    const startTs = moment(schedule.start);
    const end = schedule.end === false && startTs.isAfter(now)
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

    logger.info(`Indexing "${schedule.template}" events from ${startTs.toISOString()} to ${end === false ? 'indefinatly' : end.toISOString()}`);
    await createEvents(config, schedule, end, startTs.clone().add(interval, 'ms'), schedule.end === false);
  }
}

