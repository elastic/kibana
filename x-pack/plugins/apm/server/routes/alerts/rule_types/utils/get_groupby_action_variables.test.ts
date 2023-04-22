/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGroupByActionVariables } from './get_groupby_action_variables';

describe('getGroupByActionVariables', () => {
  it('should rename action variables', () => {
    const result = getGroupByActionVariables({
      'service.name': 'opbeans-java',
      'service.environment': 'development',
      'transaction.type': 'request',
      'transaction.name': 'tx-java',
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        'serviceName': 'opbeans-java',
        'environment': 'development',
        'transactionType': 'request',
        'transaction.name': 'tx-java'
      }
    `);
  });

  it('environment action variable should have value "Not defined"', () => {
    const result = getGroupByActionVariables({
      'service.name': 'opbeans-java',
      'service.environment': 'ENVIRONMENT_NOT_DEFINED',
      'transaction.type': 'request',
      'transaction.name': 'tx-java',
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        'serviceName': 'opbeans-java',
        'environment': 'Not defined',
        'transactionType': 'request',
        'transaction.name': 'tx-java'
      }
    `);
  });

  it('transaction.name action variable should have value "Not defined"', () => {
    const result = getGroupByActionVariables({
      'service.name': 'opbeans-java',
      'service.environment': 'development',
      'transaction.type': 'request',
      'transaction.name': 'TRANSACTION_NAME_NOT_DEFINED',
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        'serviceName': 'opbeans-java',
        'environment': 'development',
        'transactionType': 'request',
        'transaction.name': 'Not defined'
      }
    `);
  });

  it('environment and transaction.name action variables should have value "Not defined"', () => {
    const result = getGroupByActionVariables({
      'service.name': 'opbeans-java',
      'service.environment': 'ENVIRONMENT_NOT_DEFINED',
      'transaction.type': 'request',
      'transaction.name': 'TRANSACTION_NAME_NOT_DEFINED',
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        'serviceName': 'opbeans-java',
        'environment': 'Not defined',
        'transactionType': 'request',
        'transaction.name': 'Not defined'
      }
    `);
  });
});
