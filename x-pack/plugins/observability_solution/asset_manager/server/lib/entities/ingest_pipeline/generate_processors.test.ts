/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateProcessors } from './generate_processors';
import { entityDefinition } from '../helpers/fixtures/entity_definition';

describe('generateProcessors(definition)', () => {
  it('should genearte a valid pipeline', () => {
    const processors = generateProcessors(entityDefinition);
    expect(processors).toMatchSnapshot();
  });
});
