/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityDefinition } from '../helpers/fixtures/entity_definition';
import { getEntitiesHistoryIndexTemplateConfig } from './entities_history_template';

describe('getEntitiesHistoryIndexTemplateConfig(definitionId)', () => {
  it('should generate a valid index template', () => {
    const template = getEntitiesHistoryIndexTemplateConfig(entityDefinition);
    expect(template).toMatchSnapshot();
  });
});
