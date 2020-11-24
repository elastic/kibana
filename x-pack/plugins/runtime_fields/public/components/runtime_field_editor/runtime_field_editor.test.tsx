/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';
import { DocLinksStart } from 'src/core/public';

import '../../__jest__/setup_environment';
import { registerTestBed, TestBed } from '../../test_utils';
import { RuntimeField } from '../../types';
import { RuntimeFieldForm, FormState } from '../runtime_field_form/runtime_field_form';
import { RuntimeFieldEditor, Props } from './runtime_field_editor';

const setup = (props?: Props) =>
  registerTestBed(RuntimeFieldEditor, {
    memoryRouter: {
      wrapComponent: false,
    },
  })(props) as TestBed;

const docLinks: DocLinksStart = {
  ELASTIC_WEBSITE_URL: 'https://jestTest.elastic.co',
  DOC_LINK_VERSION: 'jest',
  links: {} as any,
};

describe('Runtime field editor', () => {
  let testBed: TestBed;
  let onChange: jest.Mock<Props['onChange']> = jest.fn();

  const lastOnChangeCall = (): FormState[] => onChange.mock.calls[onChange.mock.calls.length - 1];

  beforeEach(() => {
    onChange = jest.fn();
  });

  test('should render the <RuntimeFieldForm />', () => {
    testBed = setup({ docLinks });
    const { component } = testBed;

    expect(component.find(RuntimeFieldForm).length).toBe(1);
  });

  test('should accept a defaultValue and onChange prop to forward the form state', async () => {
    const defaultValue: RuntimeField = {
      name: 'foo',
      type: 'date',
      script: 'test=123',
    };
    testBed = setup({ onChange, defaultValue, docLinks });

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
