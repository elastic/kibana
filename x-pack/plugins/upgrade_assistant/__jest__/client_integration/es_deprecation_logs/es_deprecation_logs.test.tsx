/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupEnvironment } from '../helpers';
import {
  EsDeprecationLogsTestBed,
  setupESDeprecationLogsPage,
} from './es_deprecation_logs.helpers';

describe('ES deprecation logs', () => {
  let testBed: EsDeprecationLogsTestBed;
  const { server } = setupEnvironment();

  beforeEach(async () => {
    testBed = await setupESDeprecationLogsPage();
    testBed.component.update();
  });

  afterAll(() => {
    server.restore();
  });

  describe('Documentation link', () => {
    test('Has a link for migration info api docs in page header', () => {
      const { exists } = testBed;

      expect(exists('documentationLink')).toBe(true);
    });
  });
});
