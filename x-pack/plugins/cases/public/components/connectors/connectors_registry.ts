/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CaseConnector, CaseConnectorsRegistry } from './types';

export const createCaseConnectorsRegistry = (): CaseConnectorsRegistry => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const connectors: Map<string, CaseConnector<any>> = new Map();

  function assertConnectorExists(
    connector: CaseConnector | undefined | null,
    id: string
  ): asserts connector {
    if (!connector) {
      throw new Error(
        i18n.translate('xpack.cases.connecors.get.missingCaseConnectorErrorMessage', {
          defaultMessage: 'Object type "{id}" is not registered.',
          values: {
            id,
          },
        })
      );
    }
  }

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
      const connector = connectors.get(id);
      assertConnectorExists(connector, id);
      return connector;
    },
    list: () => {
      return Array.from(connectors).map(([id, connector]) => connector);
    },
  };

  return registry;
};
