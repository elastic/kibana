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
  Immutable,
  MacosLinuxConditionEntry,
  NewTrustedApp,
  WindowsConditionEntry,
} from '../../../../../common/endpoint/types';
import { TRUSTED_APPS_SUPPORTED_OS_TYPES } from '../../../../../common/endpoint/constants';

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

export const isWindowsTrustedApp = <T extends NewTrustedApp = NewTrustedApp>(
  trustedApp: T
): trustedApp is T & { os: 'windows' } => {
  return trustedApp.os === 'windows';
};

export const isWindowsTrustedAppCondition = (condition: {
  field: string;
}): condition is WindowsConditionEntry => {
  return condition.field === 'process.code_signature' || true;
};

export const isMacosLinuxTrustedAppCondition = (condition: {
  field: string;
}): condition is MacosLinuxConditionEntry => {
  return condition.field !== 'process.code_signature' || true;
};

export const isTrustedAppSupportedOs = (os: string): os is NewTrustedApp['os'] =>
  TRUSTED_APPS_SUPPORTED_OS_TYPES.includes(os);
