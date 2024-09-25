/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityDefinition, builtInEntityDefinition } from '../helpers/fixtures';
import { generateHistoryProcessors } from './generate_history_processors';

describe('generateHistoryProcessors(definition)', () => {
  it('should generate a valid pipeline for custom definition', () => {
    const processors = generateHistoryProcessors(entityDefinition);
    expect(processors).toMatchSnapshot();
  });

  it('should generate a valid pipeline for builtin definition', () => {
    const processors = generateHistoryProcessors(builtInEntityDefinition);
    expect(processors).toMatchSnapshot();
  });
});
