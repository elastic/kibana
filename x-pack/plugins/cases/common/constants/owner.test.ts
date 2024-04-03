/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertConsumers } from '@kbn/rule-data-utils';
import { OWNER_INFO } from './owners';

describe('OWNER_INFO', () => {
  it('should use all available rule consumers', () => {
    const allConsumers = new Set(Object.values(AlertConsumers));
    const ownersMappingConsumers = new Set(
      Object.values(OWNER_INFO)
        .map((value) => value.validRuleConsumers ?? [])
        .flat()
    );

    expect(allConsumers.size).toEqual(ownersMappingConsumers.size);

    for (const consumer of allConsumers) {
      expect(ownersMappingConsumers.has(consumer)).toBe(true);
    }
  });
});
