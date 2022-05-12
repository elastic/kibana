/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mount } from 'enzyme';

import { ExceptionEntries } from './exception_entries';
import { getFormattedEntryMock } from '../../exceptions.mock';
import { getEmptyValue } from '../../../empty_value';
import { getMockTheme } from '../../../../lib/kibana/kibana_react.mock';

const mockTheme = getMockTheme({
  eui: { euiSize: '10px', euiColorPrimary: '#ece', euiColorDanger: '#ece' },
});

describe('ExceptionEntries', () => {
  test('it does NOT render the and badge if only one exception item entry exists', () => {
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <ExceptionEntries
          disableActions={false}
          entries={[getFormattedEntryMock()]}
          onDelete={jest.fn()}
          onEdit={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="exceptionsViewerAndBadge"]')).toHaveLength(0);
  });

  test('it renders the and badge if more than one exception item exists', () => {
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <ExceptionEntries
          disableActions={false}
          entries={[getFormattedEntryMock(), getFormattedEntryMock()]}
          onDelete={jest.fn()}
          onEdit={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="exceptionsViewerAndBadge"]')).toHaveLength(1);
  });

  test('it invokes "onEdit" when edit button clicked', () => {
    const mockOnEdit = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <ExceptionEntries
          disableActions={false}
          entries={[getFormattedEntryMock()]}
          onDelete={jest.fn()}
          onEdit={mockOnEdit}
        />
      </ThemeProvider>
    );
    const editBtn = wrapper.find('[data-test-subj="exceptionsViewerEditBtn"] button').at(0);
    editBtn.simulate('click');

    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });

  test('it invokes "onDelete" when delete button clicked', () => {
    const mockOnDelete = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <ExceptionEntries
          disableActions={false}
          entries={[getFormattedEntryMock()]}
          onDelete={mockOnDelete}
          onEdit={jest.fn()}
        />
      </ThemeProvider>
    );
    const deleteBtn = wrapper.find('[data-test-subj="exceptionsViewerDeleteBtn"] button').at(0);
    deleteBtn.simulate('click');

    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  test('it does not render edit button if "disableActions" is "true"', () => {
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <ExceptionEntries
          disableActions={true}
          entries={[getFormattedEntryMock()]}
          onDelete={jest.fn()}
          onEdit={jest.fn()}
        />
      </ThemeProvider>
    );
    const editBtns = wrapper.find('[data-test-subj="exceptionsViewerEditBtn"] button');

    expect(editBtns).toHaveLength(0);
  });

  test('it does not render delete button if "disableActions" is "true"', () => {
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <ExceptionEntries
          disableActions={true}
          entries={[getFormattedEntryMock()]}
          onDelete={jest.fn()}
          onEdit={jest.fn()}
        />
      </ThemeProvider>
    );
    const deleteBtns = wrapper.find('[data-test-subj="exceptionsViewerDeleteBtn"] button').at(0);

    expect(deleteBtns).toHaveLength(0);
  });

  test('it renders nested entry', () => {
    const parentEntry = getFormattedEntryMock();
    parentEntry.operator = undefined;
    parentEntry.value = undefined;

    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <ExceptionEntries
          disableActions={false}
          entries={[parentEntry, getFormattedEntryMock(true)]}
          onDelete={jest.fn()}
          onEdit={jest.fn()}
        />
      </ThemeProvider>
    );

    const parentField = wrapper
      .find('[data-test-subj="exceptionFieldNameCell"] .euiTableCellContent')
      .at(0);
    const parentOperator = wrapper
      .find('[data-test-subj="exceptionFieldOperatorCell"] .euiTableCellContent')
      .at(0);
    const parentValue = wrapper
      .find('[data-test-subj="exceptionFieldValueCell"] .euiTableCellContent')
      .at(0);

    const nestedField = wrapper
      .find('[data-test-subj="exceptionFieldNameCell"] .euiTableCellContent')
      .at(1);
    const nestedOperator = wrapper
      .find('[data-test-subj="exceptionFieldOperatorCell"] .euiTableCellContent')
      .at(1);
    const nestedValue = wrapper
      .find('[data-test-subj="exceptionFieldValueCell"] .euiTableCellContent')
      .at(1);

    expect(parentField.text()).toEqual('host.name');
    expect(parentOperator.text()).toEqual(getEmptyValue());
    expect(parentValue.text()).toEqual(getEmptyValue());

    expect(nestedField.exists('.euiToolTipAnchor')).toBeTruthy();
    expect(nestedField.text()).toContain('host.name');
    expect(nestedOperator.text()).toEqual('is');
    expect(nestedValue.text()).toEqual('some name');
  });

  test('it renders non-nested entries', () => {
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <ExceptionEntries
          disableActions={false}
          entries={[getFormattedEntryMock()]}
          onDelete={jest.fn()}
          onEdit={jest.fn()}
        />
      </ThemeProvider>
    );

    const field = wrapper
      .find('[data-test-subj="exceptionFieldNameCell"] .euiTableCellContent')
      .at(0);
    const operator = wrapper
      .find('[data-test-subj="exceptionFieldOperatorCell"] .euiTableCellContent')
      .at(0);
    const value = wrapper
      .find('[data-test-subj="exceptionFieldValueCell"] .euiTableCellContent')
      .at(0);

    expect(field.exists('.euiToolTipAnchor')).toBeFalsy();
    expect(field.text()).toEqual('host.name');
    expect(operator.text()).toEqual('is');
    expect(value.text()).toEqual('some name');
  });
});
