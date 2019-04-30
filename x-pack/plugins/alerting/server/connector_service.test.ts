/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConnectorService } from './connector_service';

test('automatically registers default connectors', () => {
  const connectorService = new ConnectorService();
  expect(connectorService.has('console')).toEqual(true);
});

describe('register()', () => {
  test('able to register connectors', () => {
    const executor = jest.fn();
    const connectorService = new ConnectorService();
    connectorService.register({ id: 'my-connector', executor });
  });

  test('throws error if connector already registered', () => {
    const executor = jest.fn();
    const connectorService = new ConnectorService();
    connectorService.register({ id: 'my-connector', executor });
    expect(() =>
      connectorService.register({ id: 'my-connector', executor })
    ).toThrowErrorMatchingInlineSnapshot(`"Connector \\"my-connector\\" is already registered."`);
  });
});

describe('has()', () => {
  test('returns false for unregistered connectors', () => {
    const connectorService = new ConnectorService();
    expect(connectorService.has('my-connector')).toEqual(false);
  });

  test('returns true for default connectors', () => {
    const connectorService = new ConnectorService();
    expect(connectorService.has('console')).toEqual(true);
  });

  test('returns true after registering a connector', () => {
    const executor = jest.fn();
    const connectorService = new ConnectorService();
    connectorService.register({ id: 'my-connector', executor });
    expect(connectorService.has('my-connector'));
  });
});
