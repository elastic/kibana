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
    test('it returns an error message if the connector uses the table API', () => {
      const invalidConnector = {
        ...connector,
        config: {
          ...connector.config,
          usesTableApi: true,
        },
      };

      expect(connectorValidator(invalidConnector)).toEqual({ message: 'Deprecated connector' });
    });

    test('it does not returns an error message if the connector does not uses the table API', () => {
      const invalidConnector = {
        ...connector,
        config: {
          ...connector.config,
          usesTableApi: false,
        },
      };

      expect(connectorValidator(invalidConnector)).toBeFalsy();
    });

    test('it does not returns an error message if the config of the connector is undefined', () => {
      const { config, ...invalidConnector } = connector;

      // @ts-expect-error
      expect(connectorValidator(invalidConnector)).toBeFalsy();
    });

    test('it does not returns an error message if the config of the connector is preconfigured', () => {
      expect(connectorValidator({ ...connector, isPreconfigured: true })).toBeFalsy();
    });
  });
});
