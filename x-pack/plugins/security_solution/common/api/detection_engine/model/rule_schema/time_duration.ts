/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

type TimeUnits = 's' | 'm' | 'h' | 'd' | 'w' | 'y';

interface TimeDurationType {
  allowedUnits: TimeUnits[];
}

const isTimeSafe = (time: number) => time >= 1 && Number.isSafeInteger(time);

/**
 * Types the TimeDuration as:
 *   - A string that is not empty, and composed of a positive integer greater than 0 followed by a unit of time
 *   - in the format {safe_integer}{timeUnit}, e.g. "30s", "1m", "2h", "7d"
 *
 * Example usage:
 * ```
 * const schedule: RuleSchedule = {
 *   interval: TimeDuration({ allowedUnits: ['s', 'm', 'h'] }).parse('3h'),
 * };
 * ```
 */
export const TimeDuration = ({ allowedUnits }: TimeDurationType) => {
  return z.string().refine(
    (input) => {
      if (input.trim() === '') return false;

      try {
        const inputLength = input.length;
        const time = Number(input.trim().substring(0, inputLength - 1));
        const unit = input.trim().at(-1) as TimeUnits;

        return isTimeSafe(time) && allowedUnits.includes(unit);
      } catch (error) {
        return false;
      }
    },
    {
      message:
        'Invalid time duration format. Must be a string that is not empty, and composed of a positive integer greater than 0 followed by a unit of time in the format {safe_integer}{timeUnit}, e.g. "30s", "1m", "2h", "7d"',
    }
  );
};

export type TimeDurationSchema = ReturnType<typeof TimeDuration>;
export type TimeDuration = z.infer<TimeDurationSchema>;
