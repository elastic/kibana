/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mount } from 'enzyme';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { ExceptionItem } from './';
import { getExceptionItemMock } from '../mocks';

describe('ExceptionItem', () => {
  it('it renders ExceptionDetails and ExceptionEntries', () => {
    const exceptionItem = getExceptionItemMock();

    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionItem
          handleDelete={jest.fn()}
          handleEdit={jest.fn()}
          exceptionItem={exceptionItem}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('ExceptionDetails')).toHaveLength(1);
    expect(wrapper.find('ExceptionEntries')).toHaveLength(1);
  });

  it('it invokes "handleEdit" when edit button clicked', () => {
    const mockHandleEdit = jest.fn();
    const exceptionItem = getExceptionItemMock();

    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionItem
          handleDelete={jest.fn()}
          handleEdit={mockHandleEdit}
          exceptionItem={exceptionItem}
        />
      </ThemeProvider>
    );

    const editBtn = wrapper.find('[data-test-subj="exceptionsViewerEditBtn"] button').at(0);
    editBtn.simulate('click');

    expect(mockHandleEdit).toHaveBeenCalledTimes(1);
  });

  it('it invokes "handleDelete" when delete button clicked', () => {
    const mockHandleDelete = jest.fn();
    const exceptionItem = getExceptionItemMock();

    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionItem
          handleDelete={mockHandleDelete}
          handleEdit={jest.fn()}
          exceptionItem={exceptionItem}
        />
      </ThemeProvider>
    );

    const editBtn = wrapper.find('[data-test-subj="exceptionsViewerDeleteBtn"] button').at(0);
    editBtn.simulate('click');

    expect(mockHandleDelete).toHaveBeenCalledTimes(1);
  });

  it('it renders comment accordion closed to begin with', () => {
    const mockHandleDelete = jest.fn();
    const exceptionItem = getExceptionItemMock();

    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionItem
          handleDelete={mockHandleDelete}
          handleEdit={jest.fn()}
          exceptionItem={exceptionItem}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('.euiAccordion-isOpen')).toHaveLength(0);
  });

  it('it renders comment accordion open when showComments is true', () => {
    const mockHandleDelete = jest.fn();
    const exceptionItem = getExceptionItemMock();

    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionItem
          handleDelete={mockHandleDelete}
          handleEdit={jest.fn()}
          exceptionItem={exceptionItem}
        />
      </ThemeProvider>
    );

    const commentsBtn = wrapper
      .find('EuiButtonEmpty[data-test-subj="exceptionsViewerItemCommentsBtn"]')
      .at(0);
    commentsBtn.simulate('click');

    expect(wrapper.find('.euiAccordion-isOpen')).toHaveLength(1);
  });
});
