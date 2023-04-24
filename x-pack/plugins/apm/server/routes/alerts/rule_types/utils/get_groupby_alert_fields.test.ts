/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertFieldsFromGroupBy } from './get_groupby_alert_fields';

describe('getAlertFieldsFromGroupBy', () => {
  it('should not contain service.environment', () => {
    const result = getAlertFieldsFromGroupBy({
      'service.name': 'opbeans-java',
      'service.environment': 'ENVIRONMENT_NOT_DEFINED',
      'transaction.name': 'tx-java',
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "service.name": "opbeans-java",
        "transaction.name": "tx-java",
      }
    `);
  });

  it('should contain service.environment', () => {
    const result = getAlertFieldsFromGroupBy({
      'service.name': 'opbeans-java',
      'service.environment': 'development',
      'transaction.name': 'tx-java',
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "service.environment": "development",
        "service.name": "opbeans-java",
        "transaction.name": "tx-java",
      }
    `);
  });
});
