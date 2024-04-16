/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  timeslicesBudgetingMethodSchema,
  Duration,
  DurationUnit,
  rollingTimeWindowSchema,
  calendarAlignedTimeWindowSchema,
} from '@kbn/slo-schema';
import { IllegalArgumentError } from '../../errors';
import { SLODefinition } from '../models';

/**
 * Asserts the SLO Definition is valid from a business invariants point of view.
 * e.g. a 'target' objective requires a number between ]0, 1]
 * e.g. a 'timeslices' budgeting method requires an objective's timeslice_target to be defined.
 *
 * @param slo {SLODefinition}
 */
export function validateSLO(slo: SLODefinition) {
  if (!isValidId(slo.id)) {
    throw new IllegalArgumentError('Invalid id');
  }

  if (!isValidTargetNumber(slo.objective.target)) {
    throw new IllegalArgumentError('Invalid objective.target');
  }

  if (
    rollingTimeWindowSchema.is(slo.timeWindow) &&
    !isValidRollingTimeWindowDuration(slo.timeWindow.duration)
  ) {
    throw new IllegalArgumentError('Invalid time_window.duration');
  }

  if (
    calendarAlignedTimeWindowSchema.is(slo.timeWindow) &&
    !isValidCalendarAlignedTimeWindowDuration(slo.timeWindow.duration)
  ) {
    throw new IllegalArgumentError('Invalid time_window.duration');
  }

  if (timeslicesBudgetingMethodSchema.is(slo.budgetingMethod)) {
    if (
      slo.objective.timesliceTarget === undefined ||
      !isValidTargetNumber(slo.objective.timesliceTarget)
    ) {
      throw new IllegalArgumentError('Invalid objective.timeslice_target');
    }

    if (
      slo.objective.timesliceWindow === undefined ||
      !isValidTimesliceWindowDuration(slo.objective.timesliceWindow, slo.timeWindow.duration)
    ) {
      throw new IllegalArgumentError('Invalid objective.timeslice_window');
    }
  }

  validateSettings(slo);
}

function validateSettings(slo: SLODefinition) {
  if (!isValidFrequencySettings(slo.settings.frequency)) {
    throw new IllegalArgumentError('Invalid settings.frequency');
  }

  if (!isValidSyncDelaySettings(slo.settings.syncDelay)) {
    throw new IllegalArgumentError('Invalid settings.sync_delay');
  }
}

function isValidId(id: string): boolean {
  const MIN_ID_LENGTH = 8;
  const MAX_ID_LENGTH = 36;
  return MIN_ID_LENGTH <= id.length && id.length <= MAX_ID_LENGTH;
}

function isValidTargetNumber(value: number): boolean {
  return value > 0 && value < 1;
}

function isValidRollingTimeWindowDuration(duration: Duration): boolean {
  // 7, 30 or 90days accepted
  return duration.unit === DurationUnit.Day && [7, 30, 90].includes(duration.value);
}

function isValidCalendarAlignedTimeWindowDuration(duration: Duration): boolean {
  // 1 week or 1 month
  return [DurationUnit.Week, DurationUnit.Month].includes(duration.unit) && duration.value === 1;
}

function isValidTimesliceWindowDuration(timesliceWindow: Duration, timeWindow: Duration): boolean {
  return (
    [DurationUnit.Minute, DurationUnit.Hour].includes(timesliceWindow.unit) &&
    timesliceWindow.isShorterThan(timeWindow)
  );
}

/**
 * validate that 1 minute <= frequency < 1 hour
 */
function isValidFrequencySettings(frequency: Duration): boolean {
  return (
    frequency.isLongerOrEqualThan(new Duration(1, DurationUnit.Minute)) &&
    frequency.isShorterThan(new Duration(1, DurationUnit.Hour))
  );
}

/**
 * validate that 1 minute <= sync_delay < 6 hour
 */
function isValidSyncDelaySettings(syncDelay: Duration): boolean {
  return (
    syncDelay.isLongerOrEqualThan(new Duration(1, DurationUnit.Minute)) &&
    syncDelay.isShorterThan(new Duration(6, DurationUnit.Hour))
  );
}
