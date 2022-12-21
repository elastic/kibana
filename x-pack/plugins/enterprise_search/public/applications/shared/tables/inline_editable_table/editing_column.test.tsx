/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiFormRow } from '@elastic/eui';

import { EditingColumn } from './editing_column';

describe('EditingColumn', () => {
  const column = {
    name: 'foo',
    field: 'foo',
    render: jest.fn(),
    editingRender: jest.fn().mockReturnValue(<div data-test-subj="editing-view" />),
  };

  const requiredProps = {
    column,
  };

  const mockValues = {
    editingItemValue: { id: 1 },
    fieldErrors: {},
    rowErrors: [],
  };

  const mockActions = {
    setEditingItemValue: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(mockActions);
    setMockValues(mockValues);
  });

  it('renders', () => {
    const wrapper = shallow(<EditingColumn {...requiredProps} />);
    expect(wrapper.isEmptyRender()).toBe(false);
  });

  describe('when there is a form error for this field', () => {
    let wrapper: ShallowWrapper;
    beforeEach(() => {
      setMockValues({
        ...mockValues,
        fieldErrors: {
          foo: 'I am an error for foo and should be displayed',
        },
      });

      wrapper = shallow(
        <EditingColumn
          {...{
            ...requiredProps,
            column: {
              ...column,
              field: 'foo',
            },
          }}
        />
      );
    });

    it('renders field errors for this field if any are present', () => {
      expect(shallow(wrapper.find(EuiFormRow).prop('helpText') as any).html()).toContain(
        'I am an error for foo and should be displayed'
      );
    });

    it('renders as invalid', () => {
      expect(wrapper.find(EuiFormRow).prop('isInvalid')).toBe(true);
    });
  });

  describe('when there is a form error for this row', () => {
    let wrapper: ShallowWrapper;
    beforeEach(() => {
      setMockValues({
        ...mockValues,
        rowErrors: ['I am an error for this row'],
      });

      wrapper = shallow(<EditingColumn {...requiredProps} />);
    });

    it('renders as invalid', () => {
      expect(wrapper.find(EuiFormRow).prop('isInvalid')).toBe(true);
    });
  });

  it('renders nothing if there is no editingItemValue in state', () => {
    setMockValues({
      ...mockValues,
      editingItemValue: null,
    });

    const wrapper = shallow(<EditingColumn {...requiredProps} />);
    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('renders the column\'s "editing" view (editingRender)', () => {
    setMockValues({
      ...mockValues,
      editingItemValue: { id: 1, foo: 'foo', bar: 'bar' },
      fieldErrors: { foo: ['I am an error for foo'] },
    });

    const wrapper = shallow(
      <EditingColumn
        {...{
          ...requiredProps,
          column: {
            ...column,
            field: 'foo',
          },
          isLoading: true,
        }}
      />
    );
    expect(wrapper.find('[data-test-subj="editing-view"]').exists()).toBe(true);

    expect(column.editingRender).toHaveBeenCalled();
    // The render function is provided with the item currently being edited for rendering
    expect(column.editingRender.mock.calls[0][0]).toEqual({ id: 1, foo: 'foo', bar: 'bar' });

    // The render function is provided with a callback function to save the value once editing is finished
    const callback = column.editingRender.mock.calls[0][1];
    callback('someNewValue');
    expect(mockActions.setEditingItemValue).toHaveBeenCalledWith({
      id: 1,
      // foo is the 'field' this column is associated with, so that field is updated with the new value
      foo: 'someNewValue',
      bar: 'bar',
    });

    // The render function is provided with additional properties
    expect(column.editingRender.mock.calls[0][2]).toEqual({
      isInvalid: true, // Because there errors for 'foo'
      isLoading: true, // Because isLoading was passed as true to this prop
    });
  });
});
