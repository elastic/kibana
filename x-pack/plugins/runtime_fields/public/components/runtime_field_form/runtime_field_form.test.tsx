/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import '../../__jest__/setup_environment';
import { registerTestBed, TestBed } from '../../test_utils';

import { RuntimeFieldForm } from './runtime_field_form';

const setup = registerTestBed(RuntimeFieldForm, {
  memoryRouter: {
    wrapComponent: false,
  },
});

describe('Runtime field form', () => {
  let testBed: TestBed;

  beforeEach(() => {
    testBed = setup() as TestBed;
  });

  test('should render expected 3 fields (name, returnType, script)', () => {
    const { exists } = testBed;

    expect(exists('nameField')).toBe(true);
    expect(exists('typeField')).toBe(true);
    expect(exists('scriptField')).toBe(true);
  });
});
