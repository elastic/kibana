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
        'service.name': 'opbeans-java',
        'transaction.name': 'tx-java',
      }
    `);
  });

  it('should not contain transaction.name', () => {
    const result = getAlertFieldsFromGroupBy({
      'service.name': 'opbeans-java',
      'service.environment': 'development',
      'transaction.name': 'TRANSACTION_NAME_NOT_DEFINED',
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        'service.name': 'opbeans-java',
        'service.environment': 'development',
      }
    `);
  });

  it('should not contain service.environment and transaction.name', () => {
    const result = getAlertFieldsFromGroupBy({
      'service.name': 'opbeans-java',
      'service.environment': 'ENVIRONMENT_NOT_DEFINED',
      'transaction.name': 'TRANSACTION_NAME_NOT_DEFINED',
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        'service.name': 'opbeans-java',
      }
    `);
  });

  it('should contain service.environment and transaction.name', () => {
    const result = getAlertFieldsFromGroupBy({
      'service.name': 'opbeans-java',
      'service.environment': 'development',
      'transaction.name': 'tx-java',
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        'service.name': 'opbeans-java',
        'service.environment': 'development',
        'transaction.name': 'tx-java',
      }
    `);
  });
});
