/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getServerlessFunctionNameFromId } from './serverless';

describe('getServerlessFunctionNameFromId', () => {
  it('returns serverlessId when regex does not match', () => {
    expect(getServerlessFunctionNameFromId('foo')).toEqual('foo');
  });

  it('returns correct serverless function name', () => {
    expect(
      getServerlessFunctionNameFromId('arn:aws:lambda:us-west-2:123456789012:function:my-function')
    ).toEqual('my-function');
    expect(
      getServerlessFunctionNameFromId('arn:aws:lambda:us-west-2:123456789012:function:my:function')
    ).toEqual('my:function');
  });
});
