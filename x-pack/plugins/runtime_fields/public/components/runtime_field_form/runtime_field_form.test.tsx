/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import '../../__jest__/setup_environment';
import { registerTestBed, TestBed } from '../../test_utils';
import { RuntimeField } from '../../types';
import { RuntimeFieldForm, Props } from './runtime_field_form';

const setup = (props?: Props) =>
  registerTestBed(RuntimeFieldForm, {
    memoryRouter: {
      wrapComponent: false,
    },
  })(props) as TestBed;

const docsBaseUri = 'https://jestTest.elastic.co';

describe('Runtime field form', () => {
  let testBed: TestBed;

  test('should render expected 3 fields (name, returnType, script)', () => {
    testBed = setup({ docsBaseUri });
    const { exists } = testBed;

    expect(exists('nameField')).toBe(true);
    expect(exists('typeField')).toBe(true);
    expect(exists('scriptField')).toBe(true);
  });

  test('should have a link to learn more about painless syntax', () => {
    testBed = setup({ docsBaseUri });
    const { exists, find } = testBed;

    expect(exists('painlessSyntaxLearnMoreLink')).toBe(true);
    expect(find('painlessSyntaxLearnMoreLink').props().href).toContain(docsBaseUri);
  });

  test('should accept a defaultValue to be provided', () => {
    const defaultValue: RuntimeField = {
      name: 'foo',
      type: 'date',
      script: 'test=123',
    };
    testBed = setup({ defaultValue, docsBaseUri });
    const { find } = testBed;

    expect(find('nameField.input').props().value).toBe(defaultValue.name);
    expect(find('typeField').props().value).toBe(defaultValue.type);
    expect(find('scriptField').props().value).toBe(defaultValue.script);
  });
});
