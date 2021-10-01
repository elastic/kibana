/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CaseConnector, CaseConnectorsRegistry } from './types';

export const createCaseConnectorsRegistry = (): CaseConnectorsRegistry => {
  const connectors: Map<string, CaseConnector<any>> = new Map();

  const registry: CaseConnectorsRegistry = {
    has: (id: string) => connectors.has(id),
    register: <UIProps>(connector: CaseConnector<UIProps>) => {
      if (connectors.has(connector.id)) {
        throw new Error(
          i18n.translate('xpack.cases.connecors.register.duplicateCaseConnectorErrorMessage', {
            defaultMessage: 'Object type "{id}" is already registered.',
            values: {
              id: connector.id,
            },
          })
        );
      }

      connectors.set(connector.id, connector);
    },
    get: <UIProps>(id: string): CaseConnector<UIProps> => {
      if (!connectors.has(id)) {
        throw new Error(
          i18n.translate('xpack.cases.connecors.get.missingCaseConnectorErrorMessage', {
            defaultMessage: 'Object type "{id}" is not registered.',
            values: {
              id,
            },
          })
        );
      }
      return connectors.get(id)!;
    },
    list: () => {
      return Array.from(connectors).map(([id, connector]) => connector);
    },
  };

  return registry;
};
