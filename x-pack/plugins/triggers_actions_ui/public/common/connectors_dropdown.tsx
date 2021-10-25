/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ServiceNowActionConnector } from '../application/components/builtin_action_types/servicenow/types';
import { ActionConnector, UserConfiguredActionConnector } from '../types';

export const preconfiguredMessage = i18n.translate(
  'xpack.triggersActionsUI.sections.actionForm.preconfiguredTitleMessage',
  {
    defaultMessage: '(preconfigured)',
  }
);

export const deprecatedMessage = i18n.translate(
  'xpack.triggersActionsUI.sections.deprecatedTitleMessage',
  {
    defaultMessage: '(deprecated)',
  }
);

export const isDeprecatedConnector = (
  connector?: ActionConnector | ServiceNowActionConnector
): boolean => {
  if (connector == null) {
    return false;
  }

  if (isConnectorWithConfig(connector)) {
    return !!connector.config.isLegacy;
  }

  return false;
};

type ConnectorWithUnknownConfig = UserConfiguredActionConnector<
  Record<string, unknown>,
  Record<string, unknown>
>;

const isConnectorWithConfig = (
  connector: ActionConnector | ServiceNowActionConnector
): connector is ConnectorWithUnknownConfig => {
  const unsafeConnector = connector as UserConfiguredActionConnector<
    Record<string, unknown>,
    Record<string, unknown>
  >;

  return unsafeConnector.config != null;
};
