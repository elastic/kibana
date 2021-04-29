/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConditionEntry,
  ConditionEntryField,
  EffectScope,
  GlobalEffectScope,
  MacosLinuxConditionEntry,
  MaybeImmutable,
  PolicyEffectScope,
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

export const isGlobalEffectScope = (
  effectedScope: MaybeImmutable<EffectScope>
): effectedScope is GlobalEffectScope => {
  return effectedScope.type === 'global';
};

export const isPolicyEffectScope = (
  effectedScope: MaybeImmutable<EffectScope>
): effectedScope is PolicyEffectScope => {
  return effectedScope.type === 'policy';
};
