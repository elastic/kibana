/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { ExceptionItemComponent } from './exception_item';
import { mockBrowserFields } from '../common/containers/source/mock';
import { getMockExceptionItem, getMockNewExceptionItem } from '../common/mock/exceptions';

const theme = () => ({ eui: euiLightVars, darkMode: false });

describe('ExceptionItemComponent', () => {
  test('it renders all entry items', () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <ExceptionItemComponent
          idAria="someAriaId"
          exceptionItem={getMockExceptionItem('exception-item-1')}
          exceptionItemIndex={0}
          listType="siem"
          browserFields={mockBrowserFields}
          isAndLogicIncluded={true}
          indexPatternLoading={false}
          onChange={jest.fn()}
          setAndLogicIncluded={jest.fn()}
          onDelete={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('EntryItem[data-test-subj="exceptionEntryItem"]')).toHaveLength(2);
  });

  test('it displays and badge when more than one entry item exists', () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <ExceptionItemComponent
          idAria="someAriaId"
          exceptionItem={getMockExceptionItem('exception-item-1')}
          exceptionItemIndex={0}
          listType="siem"
          browserFields={mockBrowserFields}
          isAndLogicIncluded={true}
          indexPatternLoading={false}
          onChange={jest.fn()}
          setAndLogicIncluded={jest.fn()}
          onDelete={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('AndOrBadge').exists()).toBeTruthy();
  });

  test('it does not display an and badge if only one entry item exists', () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <ExceptionItemComponent
          idAria="someAriaId"
          exceptionItem={getMockNewExceptionItem('exception-item-1')}
          exceptionItemIndex={0}
          listType="siem"
          browserFields={mockBrowserFields}
          isAndLogicIncluded={false}
          indexPatternLoading={false}
          onChange={jest.fn()}
          setAndLogicIncluded={jest.fn()}
          onDelete={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('AndOrBadge').exists()).toBeFalsy();
  });

  test('it invokes "onEntryChange" when entry field changed', () => {
    const mockOnChange = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <ExceptionItemComponent
          idAria="someAriaId"
          exceptionItem={getMockNewExceptionItem('exception-item-1')}
          exceptionItemIndex={0}
          listType="siem"
          browserFields={mockBrowserFields}
          isAndLogicIncluded={false}
          indexPatternLoading={false}
          onChange={mockOnChange}
          setAndLogicIncluded={jest.fn()}
          onDelete={jest.fn()}
        />
      </ThemeProvider>
    );

    (wrapper
      .find('EuiComboBox[data-test-subj="exceptionsFieldSuggestionInput"]')
      .first()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .props() as any).onChange([{ label: 'host.name' }]);

    expect(mockOnChange).toHaveBeenCalledWith(
      {
        _tags: ['endpoint'],
        entries: [{ field: 'host.name', match: '', operator: 'included' }],
        id: null,
        item_id: 'exception-item-1',
        list_id: 'endpoint_list',
        name: 'Sample Endpoint Exception Item',
        tags: [],
        type: 'simple',
      },
      0
    );
  });

  test('it invokes "onEntryChange" when operator changed', () => {
    const mockOnChange = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <ExceptionItemComponent
          idAria="someAriaId"
          exceptionItem={getMockNewExceptionItem('exception-item-1')}
          exceptionItemIndex={0}
          listType="siem"
          browserFields={mockBrowserFields}
          isAndLogicIncluded={false}
          indexPatternLoading={false}
          onChange={mockOnChange}
          setAndLogicIncluded={jest.fn()}
          onDelete={jest.fn()}
        />
      </ThemeProvider>
    );

    wrapper
      .find('EuiSelect select')
      .first()
      .simulate('change', { target: { value: 'is_not_one_of' } });

    expect(mockOnChange).toHaveBeenCalledWith(
      {
        _tags: ['endpoint'],
        entries: [{ field: '', match_any: [], operator: 'excluded' }],
        id: null,
        item_id: 'exception-item-1',
        list_id: 'endpoint_list',
        name: 'Sample Endpoint Exception Item',
        tags: [],
        type: 'simple',
      },
      0
    );
  });

  test('it invokes "onEntryChange" when entry field value changed', () => {
    const mockOnChange = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <ExceptionItemComponent
          idAria="someAriaId"
          exceptionItem={getMockNewExceptionItem('exception-item-1')}
          exceptionItemIndex={0}
          listType="siem"
          browserFields={mockBrowserFields}
          isAndLogicIncluded={false}
          indexPatternLoading={false}
          onChange={mockOnChange}
          setAndLogicIncluded={jest.fn()}
          onDelete={jest.fn()}
        />
      </ThemeProvider>
    );

    (wrapper
      .find('EuiComboBox[data-test-subj="exceptionBuilderMatchComboBox"]')
      .first()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .props() as any).onChange([{ label: 'rock01' }]);

    expect(mockOnChange).toHaveBeenCalledWith(
      {
        _tags: ['endpoint'],
        entries: [{ field: '', match: 'rock01', operator: 'included' }],
        id: null,
        item_id: 'exception-item-1',
        list_id: 'endpoint_list',
        name: 'Sample Endpoint Exception Item',
        tags: [],
        type: 'simple',
      },
      0
    );
  });
});
