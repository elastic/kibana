/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { DocLinksStart } from '@kbn/core/public';

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
  links: {
    runtimeFields: { mapping: 'https://jestTest.elastic.co/to-be-defined.html' },
    scriptedFields: {} as any,
  } as any,
};

describe('Runtime field editor', () => {
  let testBed: TestBed;
  let onChange: jest.Mock<Props['onChange']> = jest.fn();

  const lastOnChangeCall = (): FormState[] => onChange.mock.calls[onChange.mock.calls.length - 1];

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

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
      script: { source: 'test=123' },
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

  test('should accept a list of existing concrete fields and display a callout when shadowing one of the fields', async () => {
    const existingConcreteFields = [{ name: 'myConcreteField', type: 'keyword' }];

    testBed = setup({ onChange, docLinks, ctx: { existingConcreteFields } });

    const { form, component, exists } = testBed;

    expect(exists('shadowingFieldCallout')).toBe(false);

    await act(async () => {
      form.setInputValue('nameField.input', existingConcreteFields[0].name);
    });
    component.update();

    expect(exists('shadowingFieldCallout')).toBe(true);
  });

  describe('validation', () => {
    test('should accept an optional list of existing runtime fields and prevent creating duplicates', async () => {
      const existingRuntimeFieldNames = ['myRuntimeField'];

      testBed = setup({ onChange, docLinks, ctx: { namesNotAllowed: existingRuntimeFieldNames } });

      const { form, component } = testBed;

      await act(async () => {
        form.setInputValue('nameField.input', existingRuntimeFieldNames[0]);
        form.setInputValue('scriptField', 'echo("hello")');
      });

      act(() => {
        jest.advanceTimersByTime(1000); // Make sure our debounced error message is in the DOM
      });

      await act(async () => {
        await lastOnChangeCall()[0].submit();
      });

      component.update();

      expect(lastOnChangeCall()[0].isValid).toBe(false);
      expect(form.getErrorsMessages()).toEqual(['There is already a field with this name.']);
    });

    test('should not count the default value as a duplicate', async () => {
      const existingRuntimeFieldNames = ['myRuntimeField'];

      const defaultValue: RuntimeField = {
        name: 'myRuntimeField',
        type: 'boolean',
        script: { source: 'emit("hello")' },
      };

      testBed = setup({
        defaultValue,
        onChange,
        docLinks,
        ctx: { namesNotAllowed: existingRuntimeFieldNames },
      });

      const { form } = testBed;

      await act(async () => {
        await lastOnChangeCall()[0].submit();
      });

      expect(lastOnChangeCall()[0].isValid).toBe(true);
      expect(form.getErrorsMessages()).toEqual([]);
    });
  });
});
