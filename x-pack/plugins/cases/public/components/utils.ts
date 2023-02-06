/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type {
  FieldConfig,
  ValidationConfig,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { ConnectorTypes } from '../../common/api';
import type { CasesPluginStart } from '../types';
import { connectorValidator as swimlaneConnectorValidator } from './connectors/swimlane/validator';
import type { CaseActionConnector } from './types';

export const getConnectorById = (
  id: string,
  connectors: CaseActionConnector[]
): CaseActionConnector | null => connectors.find((c) => c.id === id) ?? null;

const validators: Record<
  string,
  (connector: CaseActionConnector) => ReturnType<ValidationConfig['validator']>
> = {
  [ConnectorTypes.swimlane]: swimlaneConnectorValidator,
};

export const connectorDeprecationValidator = (
  connector: CaseActionConnector
): ReturnType<ValidationConfig['validator']> => {
  if (connector.isDeprecated) {
    return {
      message: 'Deprecated connector',
    };
  }
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
          return connectorDeprecationValidator(connector);
        }
      },
    },
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

export const isDeprecatedConnector = (connector?: CaseActionConnector): boolean => {
  return connector?.isDeprecated ?? false;
};

export const removeItemFromSessionStorage = (key: string) => {
  window.sessionStorage.removeItem(key);
};
