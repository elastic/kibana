/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getErrorMessagesFromLLMMessage } from './utils';

describe('getErrorStringFromLLMMessage', () => {
  it(`should return the correct array of errors`, async () => {
    const errors = ['meow and woof', 'AI rocks'];
    expect(
      getErrorMessagesFromLLMMessage('The query has syntax errors: ```\n' + errors + '\n```')
    ).toEqual(errors);
  });
  it(`should return empty array for other LLM message`, async () => {
    expect(getErrorMessagesFromLLMMessage('These results are not visualized')).toEqual([]);
    expect(
      getErrorMessagesFromLLMMessage(
        'Only following query is visualized: ```esql\n from logstash \n```'
      )
    ).toEqual([]);
  });
});
