/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FakeListLLM } from '@langchain/llms/fake';
import { getEcsGraph } from './graph';
import { getModel } from '../../providers/bedrock';

jest.mock('../../providers/bedrock');

describe('runEcsGraph', () => {
  it('Should the whole graph successfully with mocked values', () => {
    const llm1 = new FakeListLLM({
      responses: ['Response 1', 'Response 2'],
    });
    const llm2 = new FakeListLLM({
      responses: ['Response 3', 'Response 4'],
    });
    const llm3 = new FakeListLLM({
      responses: ['Response 5', 'Response 6'],
    });
  });
});
