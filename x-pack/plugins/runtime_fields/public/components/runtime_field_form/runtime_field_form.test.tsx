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

const docsBaseUri = 'https://jestTest.elastic.co';

describe('Runtime field form', () => {
  let testBed: TestBed;

  beforeEach(() => {
    testBed = setup({ docsBaseUri }) as TestBed;
  });

  test('should render expected 3 fields (name, returnType, script)', () => {
    const { exists } = testBed;

    expect(exists('nameField')).toBe(true);
    expect(exists('typeField')).toBe(true);
    expect(exists('scriptField')).toBe(true);
  });

  test('should have a link to learn more about painless syntax', () => {
    const { exists, find } = testBed;

    expect(exists('painlessSyntaxLearnMoreLink')).toBe(true);
    expect(find('painlessSyntaxLearnMoreLink').props().href).toContain(docsBaseUri);
  });
});
