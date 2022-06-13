/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import * as rt from 'io-ts';

export const INTERVAL_STRING_RE = new RegExp(`^([\\d\\.]+)\\s*(${dateMath.units.join('|')})$`);

export const parseInterval = (intervalString: string) => {
  if (intervalString) {
    const matches = intervalString.match(INTERVAL_STRING_RE);
    if (matches) {
      const value = Number(matches[1]);
      const unit = matches[2];
      return { value, unit };
    }
  }
  throw new Error(
    i18n.translate('xpack.infra.parseInterval.errorMessage', {
      defaultMessage: '{value} is not an interval string',
      values: {
        value: intervalString,
      },
    })
  );
};

const ValidUnitRT = rt.keyof({
  seconds: null,
  minutes: null,
  hours: null,
  days: null,
  weeks: null,
  months: null,
  years: null,
});
type ValidUnit = rt.TypeOf<typeof ValidUnitRT>;
const UNITS = ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years'] as ValidUnit[];

const DISPLAY_STRINGS_FOR_UNITS_PLURAL = {
  seconds: i18n.translate('xpack.infra.durationUnits.seconds.plural', {
    defaultMessage: 'seconds',
  }),
  minutes: i18n.translate('xpack.infra.durationUnits.minutes.plural', {
    defaultMessage: 'minutes',
  }),
  hours: i18n.translate('xpack.infra.durationUnits.hours.plural', {
    defaultMessage: 'hours',
  }),
  days: i18n.translate('xpack.infra.durationUnits.days.plural', {
    defaultMessage: 'days',
  }),
  weeks: i18n.translate('xpack.infra.durationUnits.weeks.plural', {
    defaultMessage: 'weeks',
  }),
  months: i18n.translate('xpack.infra.durationUnits.months.plural', {
    defaultMessage: 'months',
  }),
  years: i18n.translate('xpack.infra.durationUnits.years.plural', {
    defaultMessage: 'years',
  }),
};

const DISPLAY_STRINGS_FOR_UNITS_SINGULAR = {
  seconds: i18n.translate('xpack.infra.durationUnits.seconds.singular', {
    defaultMessage: 'second',
  }),
  minutes: i18n.translate('xpack.infra.durationUnits.minutes.singular', {
    defaultMessage: 'minute',
  }),
  hours: i18n.translate('xpack.infra.durationUnits.hours.singular', {
    defaultMessage: 'hour',
  }),
  days: i18n.translate('xpack.infra.durationUnits.days.singular', {
    defaultMessage: 'day',
  }),
  weeks: i18n.translate('xpack.infra.durationUnits.weeks.singular', {
    defaultMessage: 'week',
  }),
  months: i18n.translate('xpack.infra.durationUnits.months.singular', {
    defaultMessage: 'month',
  }),
  years: i18n.translate('xpack.infra.durationUnits.years.singular', {
    defaultMessage: 'year',
  }),
};

const getDisplayableUnit = (value: number, unit: ValidUnit) => {
  return Math.floor(value) === 1
    ? DISPLAY_STRINGS_FOR_UNITS_SINGULAR[unit]
    : DISPLAY_STRINGS_FOR_UNITS_PLURAL[unit];
};

export const convertIntervalToString = (input: string) => {
  const interval = parseInterval(input);
  if (interval?.unit === 's') {
    const duration = moment.duration(interval.value, interval.unit);
    const targetUnit = UNITS.reduce((answer, unit) => {
      if (duration.as(unit) >= 1) {
        return unit;
      }
      return answer;
    }, 'seconds');
    const durationAsUnit = duration.as(targetUnit);
    return `${Math.floor(durationAsUnit)} ${getDisplayableUnit(durationAsUnit, targetUnit)}`;
  }
};
