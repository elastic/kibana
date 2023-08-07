/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: https://github.com/elastic/kibana/issues/110895
/* eslint-disable @kbn/eslint/no_export_all */

import { Plugin } from './plugin';

export type {
  AlertAction,
  Alert,
  AlertTypeModel,
  ActionType,
  ActionTypeRegistryContract,
  RuleTypeRegistryContract,
  AlertTypeParamsExpressionProps,
  ValidationResult,
  ActionVariables,
  ActionConnector,
  IErrorObject,
  AlertFlyoutCloseReason,
  AlertTypeParams,
  AsApiContract,
} from './types';

export {
  ActionForm,
  ConnectorAddFlyout,
  ConnectorEditFlyout,
} from './application/sections/action_connector_form';

export type { ActionGroupWithCondition } from './application/sections';

export { AlertConditions, AlertConditionsGroup } from './application/sections';

export * from './common';

export function plugin() {
  return new Plugin();
}

export { Plugin };
export * from './plugin';

export { loadActionTypes } from './application/lib/action_connector_api/connector_types';

export type { TIME_UNITS } from './application/constants';
export { getTimeUnitLabel } from './common/lib/get_time_unit_label';
export type { TriggersAndActionsUiServices } from '../public/application/app';
export { transformAlert } from './application/lib/alert_api/common_transformations';
