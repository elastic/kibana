/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isConnectorDeprecated } from './is_conector_deprecated';

describe('isConnectorDeprecated', () => {
  const connector = {
    id: 'test',
    actionTypeId: '.webhook',
    name: 'Test',
    config: { apiUrl: 'http://example.com', usesTableApi: false },
    secrets: { username: 'test', password: 'test' },
    isPreconfigured: false as const,
  };

  it('returns false if the connector is not ITSM or SecOps', () => {
    expect(isConnectorDeprecated(connector)).toBe(false);
  });

  it('returns false if the connector is .servicenow and the usesTableApi=false', () => {
    expect(isConnectorDeprecated({ ...connector, actionTypeId: '.servicenow' })).toBe(false);
  });

  it('returns false if the connector is .servicenow-sir and the usesTableApi=false', () => {
    expect(isConnectorDeprecated({ ...connector, actionTypeId: '.servicenow-sir' })).toBe(false);
  });

  it('returns true if the connector is .servicenow and the usesTableApi=true', () => {
    expect(
      isConnectorDeprecated({
        ...connector,
        actionTypeId: '.servicenow',
        config: { ...connector.config, usesTableApi: true },
      })
    ).toBe(true);
  });

  it('returns true if the connector is .servicenow-sir and the usesTableApi=true', () => {
    expect(
      isConnectorDeprecated({
        ...connector,
        actionTypeId: '.servicenow-sir',
        config: { ...connector.config, usesTableApi: true },
      })
    ).toBe(true);
  });
});
