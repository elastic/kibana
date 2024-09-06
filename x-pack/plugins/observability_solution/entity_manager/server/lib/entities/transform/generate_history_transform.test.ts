/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityDefinition } from '../helpers/fixtures/entity_definition';
import { entityDefinitionWithBackfill } from '../helpers/fixtures/entity_definition_with_backfill';
import {
  generateBackfillHistoryTransform,
  generateHistoryTransform,
} from './generate_history_transform';

describe('generateHistoryTransform(definition)', () => {
  it('should generate a valid history transform', () => {
    const transform = generateHistoryTransform(entityDefinition);
    expect(transform).toMatchSnapshot();
  });
  it('should generate a valid history backfill transform', () => {
    const transform = generateBackfillHistoryTransform(entityDefinitionWithBackfill);
    expect(transform).toMatchSnapshot();
  });
});
