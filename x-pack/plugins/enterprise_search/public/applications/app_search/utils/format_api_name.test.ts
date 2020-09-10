/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { formatApiName } from './format_api_name';

describe('formatApiName', () => {
  it('will format an api name', () => {
    expect(formatApiName('SomeName')).toEqual('somename');
  });

  it('will replace sequences of non alpha-numeric characters with a dash', () => {
    expect(formatApiName('*f1  &&o$ 1  2 *&%da ')).toEqual('f1-o-1-2-da');
  });
});
