/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { AuthorizationOptions } from '../../authorization';

export const buildAuthorizationOptions = (
  featureIds?: string[],
  ruleTypeIds?: string[]
): AuthorizationOptions => {
  return featureIds
    ? {
        featureIds: isEmpty(featureIds) ? undefined : new Set(featureIds),
      }
    : ruleTypeIds
    ? { ruleTypeIds: isEmpty(ruleTypeIds) ? undefined : new Set(ruleTypeIds) }
    : {};
};
