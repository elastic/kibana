/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { asPercent } from '../../../../common/utils/formatters';
import { SLO } from '../../../typings';

export function getSloDifference(slo: SLO) {
  const difference = slo.summary.sliValue - slo.objective.target;

  return {
    value: difference,
    label: `${difference > 0 ? '+' : ''}${asPercent(difference, 1, 'n/a')}`,
  };
}
