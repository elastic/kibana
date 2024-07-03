/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinitionIdTooLong } from '../errors/entity_definition_id_too_long_error';
import { entityDefinition } from '../helpers/fixtures/entity_definition';
import { validateDefinitionCanCreateValidTransformIds } from './validate_transform_ids';

describe('validateDefinitionCanCreateValidTransformIds(definition)', () => {
  it('should not throw an error for a definition ID which is not too long', () => {
    validateDefinitionCanCreateValidTransformIds(entityDefinition);
  });

  it('should throw an error for a definition ID which is too long', () => {
    const entityDefinitionWithLongID = entityDefinition;
    entityDefinitionWithLongID.id =
      'a-really-really-really-really-really-really-really-really-really-really-long-id';

    expect(() => {
      validateDefinitionCanCreateValidTransformIds(entityDefinition);
    }).toThrow(EntityDefinitionIdTooLong);
  });
});
