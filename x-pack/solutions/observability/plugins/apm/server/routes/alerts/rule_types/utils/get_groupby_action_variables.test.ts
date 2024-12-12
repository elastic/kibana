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
      'error.grouping_key': 'error-key-0',
      'error.grouping_name': 'error-name-0',
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "environment": "development",
        "errorGroupingKey": "error-key-0",
        "errorGroupingName": "error-name-0",
        "serviceName": "opbeans-java",
        "transactionName": "tx-java",
        "transactionType": "request",
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
        "environment": "Not defined",
        "serviceName": "opbeans-java",
        "transactionName": "tx-java",
        "transactionType": "request",
      }
    `);
  });
});
