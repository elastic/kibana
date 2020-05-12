/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/public';
import { Plugin } from './plugin';

export { AlertsContextProvider } from './application/context/alerts_context';
export { ActionsConnectorsContextProvider } from './application/context/actions_connectors_context';
export { AlertAdd } from './application/sections/alert_form';
export { ActionForm } from './application/sections/action_connector_form';
export {
  AlertAction,
  Alert,
  AlertTypeModel,
  AlertTypeParamsExpressionProps,
  ActionType,
} from './types';
export {
  ConnectorAddFlyout,
  ConnectorEditFlyout,
} from './application/sections/action_connector_form';

export function plugin(ctx: PluginInitializerContext) {
  return new Plugin(ctx);
}

export { Plugin };
export * from './plugin';

export { TIME_UNITS } from './application/constants';
export { getTimeUnitLabel } from './common/lib/get_time_unit_label';
export { ForLastExpression } from './common/expression_items/for_the_last';
