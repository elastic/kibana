/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Plugin } from './plugin';

export type { TriggersAndActionsUiServices } from '../public/application/app';
export type { TIME_UNITS } from './application/constants';
export { loadActionTypes } from './application/lib/action_connector_api/connector_types';
export { AlertConditions, AlertConditionsGroup } from './application/sections';
export type { ActionGroupWithCondition } from './application/sections';
export {
  ActionForm,
  ConnectorAddFlyout,
  ConnectorEditFlyout,
} from './application/sections/action_connector_form';
export * from './common';
export { getTimeUnitLabel } from './common/lib/get_time_unit_label';
export * from './plugin';
export type {
  ActionConnector,
  ActionType,
  ActionTypeRegistryContract,
  ActionVariables,
  Alert,
  AlertAction,
  AlertFlyoutCloseReason,
  AlertTypeModel,
  AlertTypeParams,
  AlertTypeParamsExpressionProps,
  AsApiContract,
  IErrorObject,
  RuleTypeRegistryContract,
  ValidationResult,
} from './types';
export { Plugin };

export function plugin() {
  return new Plugin();
}
