/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin } from './plugin';

export { AlertsContextProvider, AlertsContextValue } from './application/context/alerts_context';
export { AlertAdd } from './application/sections/alert_form';
export {
  AlertEdit,
  AlertConditions,
  AlertConditionsGroup,
  ActionGroupWithCondition,
} from './application/sections';
export { ActionForm } from './application/sections/action_connector_form';
export {
  AlertAction,
  Alert,
  AlertTypeModel,
  ActionType,
  ActionTypeRegistryContract,
  AlertTypeRegistryContract,
  AlertTypeParamsExpressionProps,
  ValidationResult,
  ActionVariable,
  ActionVariables,
  ActionConnector,
  IErrorObject,
} from './types';
export {
  ConnectorAddFlyout,
  ConnectorEditFlyout,
} from './application/sections/action_connector_form';
export { loadActionTypes } from './application/lib/action_connector_api';
export * from './common';

export function plugin() {
  return new Plugin();
}

export { Plugin };
export * from './plugin';

export { TIME_UNITS } from './application/constants';
export { getTimeUnitLabel } from './common/lib/get_time_unit_label';
export { ForLastExpression } from './common/expression_items/for_the_last';
export { TriggersAndActionsUiServices } from '../public/application/app';
