/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  TrustedAppCreatePending,
  TrustedAppsListPageState,
  TrustedAppCreateFailure,
  TrustedAppCreateSuccess,
} from './trusted_apps_list_page_state';
import {
  ConditionEntry,
  ConditionEntryField,
  Immutable,
  MacosLinuxConditionEntry,
  WindowsConditionEntry,
} from '../../../../../common/endpoint/types';

type CreateViewPossibleStates =
  | TrustedAppsListPageState['createView']
  | Immutable<TrustedAppsListPageState['createView']>;

export const isTrustedAppCreatePendingState = (
  data: CreateViewPossibleStates
): data is TrustedAppCreatePending => {
  return data?.type === 'pending';
};

export const isTrustedAppCreateSuccessState = (
  data: CreateViewPossibleStates
): data is TrustedAppCreateSuccess => {
  return data?.type === 'success';
};

export const isTrustedAppCreateFailureState = (
  data: CreateViewPossibleStates
): data is TrustedAppCreateFailure => {
  return data?.type === 'failure';
};

export const isWindowsTrustedAppCondition = (
  condition: ConditionEntry<ConditionEntryField>
): condition is WindowsConditionEntry => {
  return condition.field === ConditionEntryField.SIGNER || true;
};

export const isMacosLinuxTrustedAppCondition = (
  condition: ConditionEntry<ConditionEntryField>
): condition is MacosLinuxConditionEntry => {
  return condition.field !== ConditionEntryField.SIGNER;
};
