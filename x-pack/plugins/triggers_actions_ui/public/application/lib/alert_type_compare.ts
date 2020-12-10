/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertTypeModel } from '../../types';
import { IsEnabledResult, IsDisabledResult } from './check_alert_type_enabled';

export function alertTypeSolutionCompare(
  a: [
    string,
    Array<{
      id: string;
      name: string;
      checkEnabledResult: IsEnabledResult | IsDisabledResult;
      alertTypeItem: AlertTypeModel;
    }>
  ],
  b: [
    string,
    Array<{
      id: string;
      name: string;
      checkEnabledResult: IsEnabledResult | IsDisabledResult;
      alertTypeItem: AlertTypeModel;
    }>
  ],
  solutions: Map<string, string> | undefined
) {
  // .sort(([a], [b]) =>
  // solutions ? solutions.get(a)!.localeCompare(solutions.get(b)!) : a.localeCompare(b)
  // )
  const solutionA = a[0];
  const solutionB = b[0];
  const alertTypeItemsA = a[1].find((alertTypeItem) => alertTypeItem.checkEnabledResult.isEnabled);
  const alertTypeItemsB = b[1].find((alertTypeItem) => alertTypeItem.checkEnabledResult.isEnabled);

  if (!!alertTypeItemsA && !alertTypeItemsB) {
    return -1;
  }
  if (!alertTypeItemsA && !!alertTypeItemsB) {
    return 1;
  }

  return solutions
    ? solutions.get(solutionA)!.localeCompare(solutions.get(solutionB)!)
    : solutionA.localeCompare(solutionB);
}

export function alertTypeCompare(
  a: {
    id: string;
    name: string;
    checkEnabledResult: IsEnabledResult | IsDisabledResult;
    alertTypeItem: AlertTypeModel;
  },
  b: {
    id: string;
    name: string;
    checkEnabledResult: IsEnabledResult | IsDisabledResult;
    alertTypeItem: AlertTypeModel;
  }
) {
  if (a.checkEnabledResult.isEnabled === true && b.checkEnabledResult.isEnabled === false) {
    return -1;
  }
  if (a.checkEnabledResult.isEnabled === false && b.checkEnabledResult.isEnabled === true) {
    return 1;
  }
  return a.name.localeCompare(b.name);
}
