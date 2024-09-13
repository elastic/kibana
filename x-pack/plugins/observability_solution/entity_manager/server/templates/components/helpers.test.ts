/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition } from '@kbn/entities-schema';
import { getCustomHistoryTemplateComponents, getCustomLatestTemplateComponents } from './helpers';

describe('helpers', () => {
  it('getCustomLatestTemplateComponents should return template component in the right sort order', () => {
    const result = getCustomLatestTemplateComponents({ id: 'test' } as EntityDefinition);
    expect(result).toEqual([
      'test@platform',
      'test-latest@platform',
      'test@custom',
      'test-latest@custom',
    ]);
  });

  it('getCustomHistoryTemplateComponents should return template component in the right sort order', () => {
    const result = getCustomHistoryTemplateComponents({ id: 'test' } as EntityDefinition);
    expect(result).toEqual([
      'test@platform',
      'test-history@platform',
      'test@custom',
      'test-history@custom',
    ]);
  });
});
