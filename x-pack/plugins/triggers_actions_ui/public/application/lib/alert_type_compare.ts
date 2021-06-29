/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertTypeModel } from '../../types';
import { IsEnabledResult, IsDisabledResult } from './check_alert_type_enabled';

export function alertTypeGroupCompare(
  left: [
    string,
    Array<{
      id: string;
      name: string;
      checkEnabledResult: IsEnabledResult | IsDisabledResult;
      alertTypeItem: AlertTypeModel;
    }>
  ],
  right: [
    string,
    Array<{
      id: string;
      name: string;
      checkEnabledResult: IsEnabledResult | IsDisabledResult;
      alertTypeItem: AlertTypeModel;
    }>
  ],
  groupNames: Map<string, string> | undefined
) {
  const groupNameA = left[0];
  const groupNameB = right[0];
  const leftAlertTypesList = left[1];
  const rightAlertTypesList = right[1];

  const hasEnabledAlertTypeInListLeft =
    leftAlertTypesList.find((alertTypeItem) => alertTypeItem.checkEnabledResult.isEnabled) !==
    undefined;

  const hasEnabledAlertTypeInListRight =
    rightAlertTypesList.find((alertTypeItem) => alertTypeItem.checkEnabledResult.isEnabled) !==
    undefined;

  if (hasEnabledAlertTypeInListLeft && !hasEnabledAlertTypeInListRight) {
    return -1;
  }
  if (!hasEnabledAlertTypeInListLeft && hasEnabledAlertTypeInListRight) {
    return 1;
  }

  return groupNames
    ? groupNames.get(groupNameA)!.localeCompare(groupNames.get(groupNameB)!)
    : groupNameA.localeCompare(groupNameB);
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
