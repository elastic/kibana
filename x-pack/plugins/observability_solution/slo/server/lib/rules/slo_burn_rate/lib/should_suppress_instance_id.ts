/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema';
import { EvaulateDependenciesResponse } from './evaluate_dependencies';

export function shouldSuppressInstanceId(
  results: EvaluateDependenciesResponse['activeRules'],
  instanceId: string
) {
  return results.reduce((acc, res) => {
    if (acc === true) return acc;
    if (res.suppressAll === true) return true;
    if (instanceId === ALL_VALUE && res.instanceIdsToSuppress.length > 0) return true;
    return (
      res.instanceIdsToSuppress.length > 0 &&
      res.instanceIdsToSuppress.some((id) => id === instanceId)
    );
  }, false);
}
