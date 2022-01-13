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

export const connectorDeprecatedMessage = i18n.translate(
  'xpack.triggersActionsUI.sections.isDeprecatedDescription',
  { defaultMessage: 'This connector is deprecated. Update it, or create a new one.' }
);

export const checkConnectorIsDeprecated = (
  connector?: ActionConnector | ServiceNowActionConnector
): boolean => {
  if (connector == null) {
    return false;
  }

  if (
    isConnectorWithConfig(connector) &&
    (connector.actionTypeId === '.servicenow' || connector.actionTypeId === '.servicenow-sir')
  ) {
    /**
     * Connectors after the Elastic ServiceNow application use the
     * Import Set API (https://developer.servicenow.com/dev.do#!/reference/api/rome/rest/c_ImportSetAPI)
     * A ServiceNow connector is considered deprecated if it uses the Table API.
     *
     * All other connectors do not have the usesTableApi config property
     * so the function will always return false for them.
     */
    return !!connector.config.usesTableApi;
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
