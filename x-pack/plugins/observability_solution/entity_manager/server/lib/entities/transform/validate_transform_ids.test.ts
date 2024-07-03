/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityDefinition } from '../helpers/fixtures/entity_definition';
import { validateDefinitionCanCreateValidTransformIds } from './validate_transform_ids';

describe('validateDefinitionCanCreateValidTransformIds(definition)', () => {
  it('should return true for a definition ID which is not too long', () => {
    const valid = validateDefinitionCanCreateValidTransformIds(entityDefinition);
    expect(valid).toBeTruthy();
  });

  it('shoulw dreturn false for a definition ID which is too long', () => {
    const entityDefinitionWithLongID = entityDefinition;
    entityDefinitionWithLongID.id = 'a-really-really-really-really-really-really-really-really-really-really-long-id';
    const valid = validateDefinitionCanCreateValidTransformIds(entityDefinition);
    expect(valid).toBeFalsy();
  });
});
