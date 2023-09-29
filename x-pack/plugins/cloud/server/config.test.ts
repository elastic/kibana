/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config } from './config';

describe('Cloud plugin config', () => {
  it('evicts unknown properties under the `serverless` structure', () => {
    const output = config.schema.validate({
      serverless: {
        project_id: 'project_id',
        unknown_prop: 'some unknown prop',
      },
    });

    expect(output.serverless).toEqual({
      project_id: 'project_id',
    });
  });
});
