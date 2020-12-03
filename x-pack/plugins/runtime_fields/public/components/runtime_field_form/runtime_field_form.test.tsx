/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';

import '../../__jest__/setup_environment';
import { registerTestBed, TestBed } from '../../test_utils';
import { RuntimeField } from '../../types';
import { RuntimeFieldForm, Props, FormState } from './runtime_field_form';

const setup = (props?: Props) =>
  registerTestBed(RuntimeFieldForm, {
    memoryRouter: {
      wrapComponent: false,
    },
  })(props) as TestBed;

const links = {
  runtimePainless: 'https://jestTest.elastic.co/to-be-defined.html',
};

describe('Runtime field form', () => {
  let testBed: TestBed;
  let onChange: jest.Mock<Props['onChange']> = jest.fn();

  const lastOnChangeCall = (): FormState[] => onChange.mock.calls[onChange.mock.calls.length - 1];

  beforeEach(() => {
    onChange = jest.fn();
  });

  test('should render expected 3 fields (name, returnType, script)', () => {
    testBed = setup({ links });
    const { exists } = testBed;

    expect(exists('nameField')).toBe(true);
    expect(exists('typeField')).toBe(true);
    expect(exists('scriptField')).toBe(true);
  });

  test('should have a link to learn more about painless syntax', () => {
    testBed = setup({ links });
    const { exists, find } = testBed;

    expect(exists('painlessSyntaxLearnMoreLink')).toBe(true);
    expect(find('painlessSyntaxLearnMoreLink').props().href).toBe(links.runtimePainless);
  });

  test('should accept a "defaultValue" prop', () => {
    const defaultValue: RuntimeField = {
      name: 'foo',
      type: 'date',
      script: { source: 'test=123' },
    };
    testBed = setup({ defaultValue, links });
    const { find } = testBed;

    expect(find('nameField.input').props().value).toBe(defaultValue.name);
    expect(find('typeField').props().value).toBe(defaultValue.type);
    expect(find('scriptField').props().value).toBe(defaultValue.script.source);
  });

  test('should accept an "onChange" prop to forward the form state', async () => {
    const defaultValue: RuntimeField = {
      name: 'foo',
      type: 'date',
      script: { source: 'test=123' },
    };
    testBed = setup({ onChange, defaultValue, links });

    expect(onChange).toHaveBeenCalled();

    let lastState = lastOnChangeCall()[0];
    expect(lastState.isValid).toBe(undefined);
    expect(lastState.isSubmitted).toBe(false);
    expect(lastState.submit).toBeDefined();

    let data;
    await act(async () => {
      ({ data } = await lastState.submit());
    });
    expect(data).toEqual(defaultValue);

    // Make sure that both isValid and isSubmitted state are now "true"
    lastState = lastOnChangeCall()[0];
    expect(lastState.isValid).toBe(true);
    expect(lastState.isSubmitted).toBe(true);
  });
});
