/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityDefinition, builtInEntityDefinition } from '../helpers/fixtures';
import { generateLatestProcessors } from './generate_latest_processors';

describe('generateLatestProcessors(definition)', () => {
  it('should generate a valid pipeline for custom definition', () => {
    const processors = generateLatestProcessors(entityDefinition);
    expect(processors).toMatchSnapshot();
  });

  it('should generate a valid pipeline for builtin definition', () => {
    const processors = generateLatestProcessors(builtInEntityDefinition);
    expect(processors).toMatchSnapshot();
  });
});
