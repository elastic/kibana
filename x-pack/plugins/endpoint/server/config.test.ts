/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EndpointConfigSchema, EndpointConfigType } from './config';

describe('test config schema', () => {
  it('test config defaults', () => {
    const config: EndpointConfigType = EndpointConfigSchema.validate({});
    expect(config.searchResultDefaultPageSize).toEqual(10);
    expect(config.searchResultDefaultFirstPageIndex).toEqual(0);
  });
});
