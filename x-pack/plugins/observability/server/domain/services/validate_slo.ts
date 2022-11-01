/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IllegalArgumentError } from '../../errors';
import { SLO } from '../../types/models';
import { Duration, DurationUnit } from '../../types/models/duration';
import { timeslicesBudgetingMethodSchema } from '../../types/schema';

/**
 * Asserts the SLO is valid from a business invariants point of view.
 * e.g. a 'target' objective requires a number between ]0, 1]
 * e.g. a 'timeslices' budgeting method requires an objective's timeslice_target to be defined.
 *
 * @param slo {SLO}
 */
export function validateSLO(slo: SLO) {
  if (!isValidTargetNumber(slo.objective.target)) {
    throw new IllegalArgumentError('Invalid objective.target');
  }

  if (!isValidTimeWindowDuration(slo.time_window.duration)) {
    throw new IllegalArgumentError('Invalid time_window.duration');
  }

  if (timeslicesBudgetingMethodSchema.is(slo.budgeting_method)) {
    if (
      slo.objective.timeslice_target === undefined ||
      !isValidTargetNumber(slo.objective.timeslice_target)
    ) {
      throw new IllegalArgumentError('Invalid objective.timeslice_target');
    }

    if (
      slo.objective.timeslice_window === undefined ||
      !isValidTimesliceWindowDuration(slo.objective.timeslice_window, slo.time_window.duration)
    ) {
      throw new IllegalArgumentError('Invalid objective.timeslice_window');
    }
  }
}

function isValidTargetNumber(value: number): boolean {
  return value > 0 && value <= 1;
}

function isValidTimeWindowDuration(duration: Duration): boolean {
  return [DurationUnit.d, DurationUnit.w, DurationUnit.M, DurationUnit.Q, DurationUnit.Y].includes(
    duration.unit
  );
}

function isValidTimesliceWindowDuration(timesliceWindow: Duration, timeWindow: Duration): boolean {
  return (
    [DurationUnit.m, DurationUnit.h].includes(timesliceWindow.unit) &&
    timesliceWindow.isShorterThan(timeWindow)
  );
}
