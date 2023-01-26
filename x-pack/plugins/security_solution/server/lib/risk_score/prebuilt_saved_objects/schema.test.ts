/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrebuiltSavedObjectsSchema } from './schema';

describe('createPrebuiltSavedObjectsSchema', () => {
  it('should throw error', () => {
    expect(() =>
      createPrebuiltSavedObjectsSchema.params.validate({ template_name: '123' })
    ).toThrow();
  });

  it.each([['hostRiskScoreDashboards', 'userRiskScoreDashboards']])(
    'should allow template %p',
    async (template) => {
      expect(createPrebuiltSavedObjectsSchema.params.validate({ template_name: template })).toEqual(
        {
          template_name: template,
        }
      );
    }
  );
});
