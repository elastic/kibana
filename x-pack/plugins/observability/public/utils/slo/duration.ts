/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { assertNever } from '@kbn/std';
import { Duration, DurationUnit } from '../../typings';

export function toDuration(duration: string): Duration {
  const durationValue = duration.substring(0, duration.length - 1);
  const durationUnit = duration.substring(duration.length - 1);

  return { value: parseInt(durationValue, 10), unit: durationUnit as DurationUnit };
}

export function toMinutes(duration: Duration) {
  switch (duration.unit) {
    case 'm':
      return duration.value;
    case 'h':
      return duration.value * 60;
    case 'd':
      return duration.value * 24 * 60;
    case 'w':
      return duration.value * 7 * 24 * 60;
    case 'M':
      return duration.value * 30 * 24 * 60;
    case 'Y':
      return duration.value * 365 * 24 * 60;
  }

  assertNever(duration.unit);
}

export function toMomentUnitOfTime(unit: string): moment.unitOfTime.Diff | undefined {
  switch (unit) {
    case 'd':
      return 'days';
    case 'w':
      return 'weeks';
    case 'M':
      return 'months';
    case 'Q':
      return 'quarters';
    case 'Y':
      return 'years';
  }
}

export function toI18nDuration(durationStr: string): string {
  const duration = toDuration(durationStr);

  switch (duration.unit) {
    case 'm':
      return i18n.translate('xpack.observability.slo.duration.minute', {
        defaultMessage: '{duration, plural, one {1 minute} other {# minutes}}',
        values: {
          duration: duration.value,
        },
      });
    case 'h':
      return i18n.translate('xpack.observability.slo.duration.hour', {
        defaultMessage: '{duration, plural, one {1 hour} other {# hours}}',
        values: {
          duration: duration.value,
        },
      });
    case 'd':
      return i18n.translate('xpack.observability.slo.duration.day', {
        defaultMessage: '{duration, plural, one {1 day} other {# days}}',
        values: {
          duration: duration.value,
        },
      });
    case 'w':
      return i18n.translate('xpack.observability.slo.duration.week', {
        defaultMessage: '{duration, plural, one {1 week} other {# weeks}}',
        values: {
          duration: duration.value,
        },
      });
    case 'M':
      return i18n.translate('xpack.observability.slo.duration.month', {
        defaultMessage: '{duration, plural, one {1 month} other {# months}}',
        values: {
          duration: duration.value,
        },
      });
    case 'Y':
      return i18n.translate('xpack.observability.slo.duration.year', {
        defaultMessage: '{duration, plural, one {1 year} other {# years}}',
        values: {
          duration: duration.value,
        },
      });
  }
}
