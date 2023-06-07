/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calendarAlignedTimeWindowSchema, rollingTimeWindowSchema } from '@kbn/slo-schema';
import { IllegalArgumentError } from '../../../errors';
import { SLO } from '../../models';
import { CompositeSLO } from '../../models/composite_slo';

export function validateCompositeSLO(compositeSlo: CompositeSLO, sloList: SLO[]) {
  assertNumberOfSourceSlo(compositeSlo);
  assertMatchingSloList(compositeSlo, sloList);
  assertSameBudgetingMethod(compositeSlo, sloList);
  assertSameTimeWindow(compositeSlo, sloList);
}

function assertNumberOfSourceSlo(compositeSlo: CompositeSLO) {
  if (compositeSlo.sources.length < 2 || compositeSlo.sources.length > 30) {
    throw new IllegalArgumentError('A composite SLO must contain between 2 and 30 source SLOs.');
  }
}

function assertMatchingSloList(compositeSlo: CompositeSLO, sloList: SLO[]) {
  const everySourceSloMatches = compositeSlo.sources.every((sourceSlo) =>
    sloList.find((slo) => sourceSlo.id === slo.id && sourceSlo.revision === slo.revision)
  );

  if (!everySourceSloMatches) {
    throw new IllegalArgumentError(
      'One or many source SLOs are not matching the specified id and revision.'
    );
  }
}

function assertSameBudgetingMethod(compositeSlo: CompositeSLO, sloList: SLO[]) {
  const haveSameBudgetingMethod = sloList.every(
    (slo) => slo.budgetingMethod === compositeSlo.budgetingMethod
  );

  if (compositeSlo.budgetingMethod === 'timeslices') {
    if (compositeSlo.objective.timesliceWindow === undefined) {
      throw new IllegalArgumentError(
        'Invalid timeslices objective. A timeslice window must be set and equal to all source SLO.'
      );
    }
    const haveSameTimesliceWindow = sloList.every((slo) =>
      slo.objective.timesliceWindow?.isEqual(compositeSlo.objective.timesliceWindow!)
    );
    if (!haveSameTimesliceWindow) {
      throw new IllegalArgumentError(
        'Invalid budgeting method. Every source SLO must use the same timeslice window.'
      );
    }
  }

  if (!haveSameBudgetingMethod) {
    throw new IllegalArgumentError(
      'Invalid budgeting method. Every source SLO must use the same budgeting method as the composite.'
    );
  }
}

function assertSameTimeWindow(compositeSlo: CompositeSLO, sloList: SLO[]) {
  let haveSameTimeWindow = false;
  if (rollingTimeWindowSchema.is(compositeSlo.timeWindow)) {
    haveSameTimeWindow = sloList.every(
      (slo) =>
        slo.timeWindow.duration.isEqual(compositeSlo.timeWindow.duration) &&
        rollingTimeWindowSchema.is(slo.timeWindow)
    );
  }

  if (calendarAlignedTimeWindowSchema.is(compositeSlo.timeWindow)) {
    haveSameTimeWindow = sloList.every(
      (slo) =>
        slo.timeWindow.duration.isEqual(compositeSlo.timeWindow.duration) &&
        calendarAlignedTimeWindowSchema.is(slo.timeWindow)
    );
  }

  if (!haveSameTimeWindow) {
    throw new IllegalArgumentError(
      'Invalid time window. Every source SLO must use the same time window as the composite.'
    );
  }
}
