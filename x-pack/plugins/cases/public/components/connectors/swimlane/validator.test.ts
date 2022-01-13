/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SwimlaneConnectorType } from '../../../../common/api';
import { swimlaneConnector as connector } from '../mock';
import { isAnyRequiredFieldNotSet, connectorValidator } from './validator';

describe('Swimlane validator', () => {
  describe('isAnyRequiredFieldNotSet', () => {
    test('it returns true if a required field is not set', () => {
      expect(isAnyRequiredFieldNotSet({ notRequired: 'test' })).toBeTruthy();
    });

    test('it returns false if all required fields are set', () => {
      expect(isAnyRequiredFieldNotSet(connector.config.mappings)).toBeFalsy();
    });
  });

  describe('connectorValidator', () => {
    test('it returns an error message if the mapping is not correct', () => {
      const invalidConnector = {
        ...connector,
        config: {
          ...connector.config,
          mappings: {},
        },
      };
      expect(connectorValidator(invalidConnector)).toEqual({ message: 'Invalid connector' });
    });

    test('it returns an error message if the connector is of type alerts', () => {
      const invalidConnector = {
        ...connector,
        config: {
          ...connector.config,
          connectorType: SwimlaneConnectorType.Alerts,
        },
      };
      expect(connectorValidator(invalidConnector)).toEqual({ message: 'Invalid connector' });
    });

    test.each([SwimlaneConnectorType.Cases, SwimlaneConnectorType.All])(
      'it does not return an error message if the connector is of type %s',
      (connectorType) => {
        const invalidConnector = {
          ...connector,
          config: {
            ...connector.config,
            connectorType,
          },
        };
        expect(connectorValidator(invalidConnector)).toBe(undefined);
      }
    );
  });
});
