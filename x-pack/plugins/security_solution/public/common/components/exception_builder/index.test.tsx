/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { ExceptionBuilder } from '.';
import { getMockExceptionItem } from '../../mock/exceptions';

jest.mock('../../lib/kibana');

const theme = () => ({ eui: euiLightVars, darkMode: false });

describe('ExceptionBuilder', () => {
  test('it renders "Add Exception" if no exception items yet exist', () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <ExceptionBuilder
          exceptionItems={[]}
          listType="siem"
          listId="123"
          dataTestSubj="myExceptionBuilder"
          idAria="myExceptionBuilder"
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find('[data-test-subj="exceptionsAddNewExceptionButton"]').exists()
    ).toBeTruthy();
  });

  test('it adds an exception item when "Add exception" clicked and no exception items exist', () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <ExceptionBuilder
          exceptionItems={[]}
          listType="siem"
          listId="123"
          dataTestSubj="myExceptionBuilder"
          idAria="myExceptionBuilder"
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="exceptionsAddNewExceptionButton"] button').simulate('click');

    expect(wrapper.find('EuiFlexItem[data-test-subj="myExceptionBuilder"]')).toHaveLength(1);
    expect(wrapper.find('EuiFlexGroup[data-test-subj="exceptionItemEntryContainer"]')).toHaveLength(
      1
    );
  });

  test('it adds an exception item entry when "Add exception" clicked and a single exception item exists with no entries', () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <ExceptionBuilder
          exceptionItems={[{ ...getMockExceptionItem('exception-item-1'), entries: [] }]}
          listType="siem"
          listId="123"
          dataTestSubj="myExceptionBuilder"
          idAria="myExceptionBuilder"
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="exceptionsAddNewExceptionButton"] button').simulate('click');

    expect(wrapper.find('EuiFlexItem[data-test-subj="myExceptionBuilder"]')).toHaveLength(1);
    expect(wrapper.find('EuiFlexGroup[data-test-subj="exceptionItemEntryContainer"]')).toHaveLength(
      1
    );
  });

  test('it adds an exception item when "or" button is clicked', () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <ExceptionBuilder
          exceptionItems={[getMockExceptionItem('exception-item-1')]}
          listType="siem"
          listId="123"
          dataTestSubj="myExceptionBuilder"
          idAria="myExceptionBuilder"
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('EuiFlexItem[data-test-subj="myExceptionBuilder"]')).toHaveLength(1);

    wrapper.find('[data-test-subj="exceptionsOrButton"] button').simulate('click');

    expect(wrapper.find('EuiFlexItem[data-test-subj="myExceptionBuilder"]')).toHaveLength(2);
  });

  test('it adds an exception item entry when "and" button is clicked', () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <ExceptionBuilder
          exceptionItems={[getMockExceptionItem('exception-item-1')]}
          listType="siem"
          listId="123"
          dataTestSubj="myExceptionBuilder"
          idAria="myExceptionBuilder"
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('EuiFlexGroup[data-test-subj="exceptionItemEntryContainer"]')).toHaveLength(
      2
    );

    wrapper.find('[data-test-subj="exceptionsAndButton"] button').simulate('click');

    expect(wrapper.find('EuiFlexGroup[data-test-subj="exceptionItemEntryContainer"]')).toHaveLength(
      3
    );
  });

  test('it deletes an exception item entry when "delete" button is clicked', () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <ExceptionBuilder
          exceptionItems={[getMockExceptionItem('exception-item-1')]}
          listType="siem"
          listId="123"
          dataTestSubj="myExceptionBuilder"
          idAria="myExceptionBuilder"
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('EuiFlexGroup[data-test-subj="exceptionItemEntryContainer"]')).toHaveLength(
      2
    );

    wrapper
      .find('[data-test-subj="exceptionItemEntryDeleteButton"] button')
      .first()
      .simulate('click');

    expect(wrapper.find('EuiFlexGroup[data-test-subj="exceptionItemEntryContainer"]')).toHaveLength(
      1
    );
  });

  test('it displays "add exception" button if all entries deleted', () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <ExceptionBuilder
          exceptionItems={[getMockExceptionItem('exception-item-1')]}
          listType="siem"
          listId="123"
          dataTestSubj="myExceptionBuilder"
          idAria="myExceptionBuilder"
          onChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('EuiFlexGroup[data-test-subj="exceptionItemEntryContainer"]')).toHaveLength(
      2
    );
    expect(wrapper.find('[data-test-subj="exceptionsAddNewExceptionButton"]').exists()).toBeFalsy();

    wrapper
      .find('[data-test-subj="exceptionItemEntryDeleteButton"] button')
      .first()
      .simulate('click');

    wrapper
      .find('[data-test-subj="exceptionItemEntryDeleteButton"] button')
      .first()
      .simulate('click');

    expect(
      wrapper.find('[data-test-subj="exceptionsAddNewExceptionButton"]').exists()
    ).toBeTruthy();
  });
});
