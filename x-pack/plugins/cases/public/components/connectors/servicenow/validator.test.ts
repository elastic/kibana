/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connector } from '../mock';
import { connectorValidator } from './validator';

describe('ServiceNow validator', () => {
  describe('connectorValidator', () => {
    test('it returns an error message if the connector is legacy', () => {
      const invalidConnector = {
        ...connector,
        config: {
          ...connector.config,
          isLegacy: true,
        },
      };

      expect(connectorValidator(invalidConnector)).toEqual({ message: 'Deprecated connector' });
    });

    test('it does not returns an error message if the connector is not legacy', () => {
      const invalidConnector = {
        ...connector,
        config: {
          ...connector.config,
          isLegacy: false,
        },
      };

      expect(connectorValidator(invalidConnector)).toBeFalsy();
    });
  });
});
