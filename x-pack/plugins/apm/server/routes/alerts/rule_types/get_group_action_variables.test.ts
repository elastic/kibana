/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGroupByActionVariables } from './get_group_action_variables';

const groupByFields = {
  'service.name': 'opbeans-java',
  'transaction.name': 'tx-java',
};

describe('getGroupByActionVariables', () => {
  it('should rename transaction.name key to transactionName', () => {
    const result = getGroupByActionVariables(groupByFields);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "service.name": "opbeans-java",
        "transactionName": "tx-java",
      }
    `);
  });
});
