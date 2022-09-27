/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InvalidParameter } from '../../errors';
import { createSLO } from '../../services/slo/fixtures/slo';

describe('SLO', () => {
  describe('Invariants validation', () => {
    it('throws when target objective is greater than 1', () => {
      expect(() => createSLO({ objective: { target: 1.2 } })).toThrow(
        new InvalidParameter('Invalid objective target')
      );
    });
  });
});
