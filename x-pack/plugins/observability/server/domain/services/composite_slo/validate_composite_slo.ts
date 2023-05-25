/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rollingTimeWindowSchema } from '@kbn/slo-schema';
import { IllegalArgumentError } from '../../../errors';
import { SLO } from '../../models';
import { CompositeSLO } from '../../models/composite_slo';

export function validateCompositeSLO(compositeSlo: CompositeSLO, sloList: SLO[]) {
  assertMatchingSloList(compositeSlo, sloList);
  assertSameBudgetingMethod(compositeSlo, sloList);
  assertSameRollingTimeWindow(compositeSlo, sloList);
}

function assertMatchingSloList(compositeSlo: CompositeSLO, sloList: SLO[]) {
  const everyCombinedSloMatches = compositeSlo.sources.every((sourceSlo) =>
    sloList.find((slo) => sourceSlo.id === slo.id && sourceSlo.revision === slo.revision)
  );

  if (!everyCombinedSloMatches) {
    throw new IllegalArgumentError(
      'One or many source SLOs are not matching the specified id and revision.'
    );
  }
}

function assertSameBudgetingMethod(compositeSlo: CompositeSLO, sloList: SLO[]) {
  const haveSameBudgetingMethod = sloList.every(
    (slo) => slo.budgetingMethod === compositeSlo.budgetingMethod
  );
  if (!haveSameBudgetingMethod) {
    throw new IllegalArgumentError(
      'Invalid budgeting method. Every source SLO must use the same budgeting method as the composite.'
    );
  }
}

function assertSameRollingTimeWindow(compositeSlo: CompositeSLO, sloList: SLO[]) {
  const haveSameTimeWindow = sloList.every(
    (slo) =>
      rollingTimeWindowSchema.is(slo.timeWindow) &&
      slo.timeWindow.duration.isEqual(compositeSlo.timeWindow.duration)
  );
  if (!haveSameTimeWindow) {
    throw new IllegalArgumentError(
      'Invalid time window. Every source SLO must use the same time window as the composite.'
    );
  }
}
