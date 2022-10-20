/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertNever } from '@kbn/std';
import * as moment from 'moment';

enum DurationUnit {
  'm' = 'm',
  'h' = 'h',
  'd' = 'd',
  'w' = 'w',
  'M' = 'M',
  'Q' = 'Q',
  'Y' = 'Y',
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
}

const toMomentUnitOfTime = (unit: DurationUnit): moment.unitOfTime.Diff => {
  switch (unit) {
    case DurationUnit.m:
      return 'minutes';
    case DurationUnit.h:
      return 'hours';
    case DurationUnit.d:
      return 'days';
    case DurationUnit.w:
      return 'weeks';
    case DurationUnit.M:
      return 'months';
    case DurationUnit.Q:
      return 'quarters';
    case DurationUnit.Y:
      return 'years';
    default:
      assertNever(unit);
  }
};

export { Duration, DurationUnit, toMomentUnitOfTime };
