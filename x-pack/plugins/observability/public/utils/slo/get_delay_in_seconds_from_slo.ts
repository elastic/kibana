/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLOResponse, timeslicesBudgetingMethodSchema, durationType } from '@kbn/slo-schema';
import { isLeft } from 'fp-ts/lib/Either';

export function getDelayInSecondsFromSLO(slo: SLOResponse) {
  const fixedInterval = timeslicesBudgetingMethodSchema.is(slo.budgetingMethod)
    ? durationStringToSeconds(slo.objective.timesliceWindow)
    : 60;
  const syncDelay = durationStringToSeconds(slo.settings.syncDelay);
  const frequency = durationStringToSeconds(slo.settings.frequency);
  return fixedInterval + syncDelay + frequency;
}

function durationStringToSeconds(duration: string | undefined) {
  if (!duration) {
    return 0;
  }
  const result = durationType.decode(duration);
  if (isLeft(result)) {
    throw new Error(`Invalid duration string: ${duration}`);
  }
  return result.right.asSeconds();
}
