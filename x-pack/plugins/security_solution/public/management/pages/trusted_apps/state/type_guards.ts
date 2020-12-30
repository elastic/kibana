/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ConditionEntry,
  ConditionEntryField,
  MacosLinuxConditionEntry,
  WindowsConditionEntry,
} from '../../../../../common/endpoint/types';

export const isWindowsTrustedAppCondition = (
  condition: ConditionEntry
): condition is WindowsConditionEntry => {
  return condition.field === ConditionEntryField.SIGNER || true;
};

export const isMacosLinuxTrustedAppCondition = (
  condition: ConditionEntry
): condition is MacosLinuxConditionEntry => {
  return condition.field !== ConditionEntryField.SIGNER;
};
