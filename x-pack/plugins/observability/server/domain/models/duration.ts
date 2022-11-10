/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertNever } from '@kbn/std';
import * as moment from 'moment';

enum DurationUnit {
  'Minute' = 'm',
  'Hour' = 'h',
  'Day' = 'd',
  'Week' = 'w',
  'Month' = 'M',
  'Quarter' = 'Q',
  'Year' = 'Y',
}

class Duration {
  constructor(public readonly value: number, public readonly unit: DurationUnit) {
    if (isNaN(value) || value <= 0) {
      throw new Error('invalid duration value');
    }
    if (!Object.values(DurationUnit).includes(unit as unknown as DurationUnit)) {
      throw new Error('invalid duration unit');
    }
  }

  isShorterThan(other: Duration): boolean {
    const otherDurationMoment = moment.duration(other.value, toMomentUnitOfTime(other.unit));
    const currentDurationMoment = moment.duration(this.value, toMomentUnitOfTime(this.unit));
    return currentDurationMoment.asSeconds() < otherDurationMoment.asSeconds();
  }

  format(): string {
    return `${this.value}${this.unit}`;
  }
}

const toMomentUnitOfTime = (unit: DurationUnit): moment.unitOfTime.Diff => {
  switch (unit) {
    case DurationUnit.Minute:
      return 'minutes';
    case DurationUnit.Hour:
      return 'hours';
    case DurationUnit.Day:
      return 'days';
    case DurationUnit.Week:
      return 'weeks';
    case DurationUnit.Month:
      return 'months';
    case DurationUnit.Quarter:
      return 'quarters';
    case DurationUnit.Year:
      return 'years';
    default:
      assertNever(unit);
  }
};

export { Duration, DurationUnit, toMomentUnitOfTime };
