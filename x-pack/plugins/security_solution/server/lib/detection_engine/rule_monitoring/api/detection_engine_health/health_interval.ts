/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import type {
  HealthInterval,
  HealthIntervalParameters,
} from '../../../../../../common/api/detection_engine/rule_monitoring';
import {
  HealthIntervalGranularity,
  HealthIntervalType,
} from '../../../../../../common/api/detection_engine/rule_monitoring';
import { assertUnreachable } from '../../../../../../common/utility_types';

const DEFAULT_INTERVAL_PARAMETERS: HealthIntervalParameters = {
  type: HealthIntervalType.last_day,
  granularity: HealthIntervalGranularity.hour,
};

export const validateHealthInterval = (
  params: HealthIntervalParameters | undefined,
  now: moment.Moment
): HealthInterval => {
  const parameters = params ?? DEFAULT_INTERVAL_PARAMETERS;

  const from = getFrom(parameters, now);
  const to = getTo(parameters, now);
  const duration = moment.duration(to.diff(from));

  // TODO: https://github.com/elastic/kibana/issues/125642 Validate that:
  //   - to > from
  //   - granularity is not too big, e.g. < duration (could be invalid when custom_range)
  //   - granularity is not too small (could be invalid when custom_range)

  return {
    type: parameters.type,
    granularity: parameters.granularity,
    from: from.utc().toISOString(),
    to: to.utc().toISOString(),
    duration: duration.toISOString(),
  };
};

const getFrom = (params: HealthIntervalParameters, now: moment.Moment): moment.Moment => {
  const { type } = params;

  // NOTE: it's important to clone `now` with `moment(now)` because moment objects are mutable.
  // If you call .subtract() or other methods on the original `now`, you will change it which
  // might cause bugs depending on how you use it in your calculations later.

  if (type === HealthIntervalType.custom_range) {
    return moment(params.from);
  }
  if (type === HealthIntervalType.last_hour) {
    return moment(now).subtract(1, 'hour');
  }
  if (type === HealthIntervalType.last_day) {
    return moment(now).subtract(1, 'day');
  }
  if (type === HealthIntervalType.last_week) {
    return moment(now).subtract(1, 'week');
  }
  if (type === HealthIntervalType.last_month) {
    return moment(now).subtract(1, 'month');
  }
  if (type === HealthIntervalType.last_year) {
    return moment(now).subtract(1, 'year');
  }

  return assertUnreachable(type, 'Unhandled health interval type');
};

const getTo = (params: HealthIntervalParameters, now: moment.Moment): moment.Moment => {
  const { type } = params;

  if (type === HealthIntervalType.custom_range) {
    return moment(params.to);
  }

  // NOTE: it's important to clone `now` with `moment(now)` because moment objects are mutable. If you
  // return the original now from this method and then call .subtract() or other methods on it, it will
  // change the original now which might cause bugs depending on how you use it in your calculations later.

  return moment(now);
};
