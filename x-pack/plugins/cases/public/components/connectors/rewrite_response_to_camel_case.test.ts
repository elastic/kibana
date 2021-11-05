/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConnectorExecutorResult,
  rewriteResponseToCamelCase,
} from './rewrite_response_to_camel_case';

const responseWithSnakeCasedFields: ConnectorExecutorResult<{}> = {
  service_message: 'oh noooooo',
  connector_id: '1213',
  data: {},
  status: 'ok',
};

describe('rewriteResponseToCamelCase works correctly', () => {
  it('correctly transforms snake case to camel case for ActionTypeExecuteResults', () => {
    const camelCasedData = rewriteResponseToCamelCase(responseWithSnakeCasedFields);

    expect(camelCasedData).toEqual({
      serviceMessage: 'oh noooooo',
      actionId: '1213',
      data: {},
      status: 'ok',
    });
  });
});
