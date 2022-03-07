/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IconType } from '@elastic/eui';
import { ConnectorTypes } from '../../common/api';
import { FieldConfig, ValidationConfig } from '../common/shared_imports';
import { CasesPluginStart } from '../types';
import { connectorValidator as swimlaneConnectorValidator } from './connectors/swimlane/validator';
import { connectorValidator as servicenowConnectorValidator } from './connectors/servicenow/validator';
import { CaseActionConnector } from './types';

export const getConnectorById = (
  id: string,
  connectors: CaseActionConnector[]
): CaseActionConnector | null => connectors.find((c) => c.id === id) ?? null;

const validators: Record<
  string,
  (connector: CaseActionConnector) => ReturnType<ValidationConfig['validator']>
> = {
  [ConnectorTypes.swimlane]: swimlaneConnectorValidator,
  [ConnectorTypes.serviceNowITSM]: servicenowConnectorValidator,
  [ConnectorTypes.serviceNowSIR]: servicenowConnectorValidator,
};

export const getConnectorsFormValidators = ({
  connectors = [],
  config = {},
}: {
  connectors: CaseActionConnector[];
  config: FieldConfig;
}): FieldConfig => ({
  ...config,
  validations: [
    {
      validator: ({ value: connectorId }) => {
        const connector = getConnectorById(connectorId as string, connectors);
        if (connector != null) {
          return validators[connector.actionTypeId]?.(connector);
        }
      },
    },
  ],
});

export const getConnectorIcon = (
  triggersActionsUi: CasesPluginStart['triggersActionsUi'],
  type?: string
): IconType => {
  /**
   * triggersActionsUi.actionTypeRegistry.get will throw an error if the type is not registered.
   * This will break Kibana if not handled properly.
   */
  const emptyResponse = '';

  if (type == null) {
    return emptyResponse;
  }

  try {
    if (triggersActionsUi.actionTypeRegistry.has(type)) {
      return triggersActionsUi.actionTypeRegistry.get(type).iconClass;
    }
  } catch {
    return emptyResponse;
  }

  return emptyResponse;
};

// TODO: Remove when the applications are certified
export const isDeprecatedConnector = (connector?: CaseActionConnector): boolean => {
  if (connector == null) {
    return false;
  }

  if (connector.actionTypeId === '.servicenow' || connector.actionTypeId === '.servicenow-sir') {
    /**
     * Connector's prior to the Elastic ServiceNow application
     * use the Table API (https://developer.servicenow.com/dev.do#!/reference/api/rome/rest/c_TableAPI)
     * Connectors after the Elastic ServiceNow application use the
     * Import Set API (https://developer.servicenow.com/dev.do#!/reference/api/rome/rest/c_ImportSetAPI)
     * A ServiceNow connector is considered deprecated if it uses the Table API.
     */
    return !!connector.config.usesTableApi;
  }

  return false;
};
