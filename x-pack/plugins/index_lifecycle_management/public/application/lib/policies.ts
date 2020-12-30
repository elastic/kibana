/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PolicyFromES } from '../../../common/types';

export const splitSizeAndUnits = (field: string): { size: string; units: string } => {
  let size = '';
  let units = '';

  const result = /(\d+)(\w+)/.exec(field);
  if (result) {
    size = result[1];
    units = result[2];
  }

  return {
    size,
    units,
  };
};

export const getPolicyByName = (
  policies: PolicyFromES[] | null | undefined,
  policyName: string = ''
): PolicyFromES | undefined => {
  if (policies && policies.length > 0) {
    return policies.find((policy: PolicyFromES) => policy.name === policyName);
  }
};
