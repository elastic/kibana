/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: https://github.com/elastic/kibana/issues/110895
/* eslint-disable @kbn/eslint/no_export_all */

import { PluginInitializerContext } from 'kibana/server';
import { Plugin } from './plugin';

export type {
  RuleAction,
  Rule,
  RuleType,
  RuleTypeIndex,
  RuleTypeModel,
  ActionType,
  ActionTypeRegistryContract,
  RuleTypeRegistryContract,
  RuleTypeParamsExpressionProps,
  ValidationResult,
  ActionVariables,
  ActionConnector,
  IErrorObject,
  RuleFlyoutCloseReason,
  RuleTypeParams,
  AsApiContract,
  RuleTableItem,
} from './types';

export {
  ActionForm,
  ConnectorAddFlyout,
  ConnectorEditFlyout,
} from './application/sections/action_connector_form';

export type { ActionGroupWithCondition } from './application/sections';

export { AlertConditions, AlertConditionsGroup } from './application/sections';

export * from './common';

export function plugin(context: PluginInitializerContext) {
  return new Plugin(context);
}

export { Plugin };
export * from './plugin';
// TODO remove this import when we expose the Rules tables as a component
export { loadRules } from './application/lib/rule_api/rules';
export { deleteRules } from './application/lib/rule_api/delete';
export { enableRule } from './application/lib/rule_api/enable';
export { disableRule } from './application/lib/rule_api/disable';
export { muteRule } from './application/lib/rule_api/mute';
export { unmuteRule } from './application/lib/rule_api/unmute';
export { loadRuleAggregations } from './application/lib/rule_api/aggregate';
export { useLoadRuleTypes } from './application/hooks/use_load_rule_types';

export { loadActionTypes } from './application/lib/action_connector_api/connector_types';

export type { TIME_UNITS } from './application/constants';
export { getTimeUnitLabel } from './common/lib/get_time_unit_label';
export type { TriggersAndActionsUiServices } from '../public/application/app';
