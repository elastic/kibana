/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { groupInputs } from './group_inputs';
import { packageWithIntegrations } from './fixtures/packages';

describe('groupInputs()', () => {
  it('should group inputs for a package with multiple policy templates and input groups correctly', () => {
    expect(groupInputs(packageWithIntegrations)).toMatchSnapshot();
  });
});
