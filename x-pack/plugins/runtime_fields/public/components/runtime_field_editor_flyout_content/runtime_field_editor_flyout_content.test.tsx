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
import { RuntimeFieldEditorFlyoutContent, Props } from './runtime_field_editor_flyout_content';

const setup = (props?: Props) =>
  registerTestBed(RuntimeFieldEditorFlyoutContent, {
    memoryRouter: {
      wrapComponent: false,
    },
  })(props) as TestBed;

const docLinks: DocLinksStart = {
  ELASTIC_WEBSITE_URL: 'htts://jestTest.elastic.co',
  DOC_LINK_VERSION: 'jest',
  links: {
    runtimeFields: { mapping: 'https://jestTest.elastic.co/to-be-defined.html' },
    scriptedFields: {} as any,
  } as any,
};

const noop = () => {};
const defaultProps = { onSave: noop, onCancel: noop, docLinks };

describe('Runtime field editor flyout', () => {
  test('should have a flyout title', () => {
    const { exists, find } = setup(defaultProps);

    expect(exists('flyoutTitle')).toBe(true);
    expect(find('flyoutTitle').text()).toBe('Create new field');
  });

  test('should allow a runtime field to be provided', () => {
    const field: RuntimeField = {
      name: 'foo',
      type: 'date',
      script: { source: 'test=123' },
    };

    const { find } = setup({ ...defaultProps, defaultValue: field });

    expect(find('flyoutTitle').text()).toBe(`Edit ${field.name} field`);
    expect(find('nameField.input').props().value).toBe(field.name);
    expect(find('typeField').props().value).toBe(field.type);
    expect(find('scriptField').props().value).toBe(field.script.source);
  });

  test('should accept an onSave prop', async () => {
    const field: RuntimeField = {
      name: 'foo',
      type: 'date',
      script: { source: 'test=123' },
    };
    const onSave: jest.Mock<Props['onSave']> = jest.fn();

    const { find } = setup({ ...defaultProps, onSave, defaultValue: field });

    await act(async () => {
      find('saveFieldButton').simulate('click');
    });

    expect(onSave).toHaveBeenCalled();
    const fieldReturned: RuntimeField = onSave.mock.calls[onSave.mock.calls.length - 1][0];
    expect(fieldReturned).toEqual(field);
  });

  test('should accept an onCancel prop', () => {
    const onCancel = jest.fn();
    const { find } = setup({ ...defaultProps, onCancel });

    find('closeFlyoutButton').simulate('click');

    expect(onCancel).toHaveBeenCalled();
  });

  describe('validation', () => {
    test('should validate the fields and prevent saving invalid form', async () => {
      const onSave: jest.Mock<Props['onSave']> = jest.fn();

      const { find, exists, form, component } = setup({ ...defaultProps, onSave });

      expect(find('saveFieldButton').props().disabled).toBe(false);

      await act(async () => {
        find('saveFieldButton').simulate('click');
      });
      component.update();

      expect(onSave).toHaveBeenCalledTimes(0);
      expect(find('saveFieldButton').props().disabled).toBe(true);
      expect(form.getErrorsMessages()).toEqual(['Give a name to the field.']);
      expect(exists('formError')).toBe(true);
      expect(find('formError').text()).toBe('Fix errors in form before continuing.');
    });

    test('should forward values from the form', async () => {
      const onSave: jest.Mock<Props['onSave']> = jest.fn();

      const { find, form } = setup({ ...defaultProps, onSave });

      act(() => {
        form.setInputValue('nameField.input', 'someName');
        form.setInputValue('scriptField', 'script=123');
      });

      await act(async () => {
        find('saveFieldButton').simulate('click');
      });

      expect(onSave).toHaveBeenCalled();
      let fieldReturned: RuntimeField = onSave.mock.calls[onSave.mock.calls.length - 1][0];
      expect(fieldReturned).toEqual({
        name: 'someName',
        type: 'keyword', // default to keyword
        script: { source: 'script=123' },
      });

      // Change the type and make sure it is forwarded
      act(() => {
        find('typeField').simulate('change', [
          {
            label: 'Other type',
            value: 'other_type',
          },
        ]);
      });
      await act(async () => {
        find('saveFieldButton').simulate('click');
      });
      fieldReturned = onSave.mock.calls[onSave.mock.calls.length - 1][0];
      expect(fieldReturned).toEqual({
        name: 'someName',
        type: 'other_type',
        script: { source: 'script=123' },
      });
    });
  });
});
