/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENABLE_NEW_SN_ITSM_CONNECTOR,
  ENABLE_NEW_SN_SIR_CONNECTOR,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../actions/server/constants/connectors';
import {
  ActionConnector,
  ActionTypeIndex,
  AlertAction,
  UserConfiguredActionConnector,
} from '../../../types';

export const isDeprecatedConnector = (connector: ActionConnector): boolean => {
  // TODO: Remove ENABLE_* portion when the applications are certified
  if (!ENABLE_NEW_SN_ITSM_CONNECTOR && connector.actionTypeId === '.servicenow') {
    return true;
  }

  if (!ENABLE_NEW_SN_SIR_CONNECTOR && connector.actionTypeId === '.servicenow-sir') {
    return true;
  }

  // TODO: add a type guard
  const unsafeConfig = (
    connector as UserConfiguredActionConnector<Record<string, unknown>, Record<string, unknown>>
  ).config;

  return !!unsafeConfig.isLegacy;
};

export const getEnabledAndConfiguredConnectors = (
  connectors: ActionConnector[],
  actionItem: AlertAction,
  actionTypesIndex: ActionTypeIndex
): ActionConnector[] => {
  const actionType = actionTypesIndex[actionItem.actionTypeId];

  return connectors.filter(
    (connector) =>
      connector.actionTypeId === actionItem.actionTypeId &&
      // include only enabled by config connectors or preconfigured
      (actionType?.enabledInConfig || connector.isPreconfigured)
  );
};
