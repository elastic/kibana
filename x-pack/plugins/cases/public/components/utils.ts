/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorTypes } from '../../common';
import { FieldConfig, ValidationConfig } from '../common/shared_imports';
import { connectorValidator as swimlaneConnectorValidator } from './connectors/swimlane/validator';
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
