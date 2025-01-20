/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readStreamResponse } from '../fixtures/read_streams_response';
import { readStreamResponseSchema } from './read_streams_response';

describe('ReadStreamResponse', () => {
  it('should successfully parse', () => {
    expect(readStreamResponseSchema.parse(readStreamResponse)).toMatchSnapshot();
  });
});
