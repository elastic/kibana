/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mount } from 'enzyme';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import moment from 'moment-timezone';

import { ExceptionDetails } from './exception_details';
import { getExceptionListItemSchemaMock } from '../../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { getCommentsArrayMock } from '../../../../../../../lists/common/schemas/types/comments.mock';

describe('ExceptionDetails', () => {
  beforeEach(() => {
    moment.tz.setDefault('UTC');
  });

  afterEach(() => {
    moment.tz.setDefault('Browser');
  });

  test('it renders no comments button if no comments exist', () => {
    const exceptionItem = getExceptionListItemSchemaMock();
    exceptionItem.comments = [];

    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionDetails
          showComments={false}
          onCommentsClick={jest.fn()}
          exceptionItem={exceptionItem}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="exceptionsViewerItemCommentsBtn"]')).toHaveLength(0);
  });

  test('it renders comments button if comments exist', () => {
    const exceptionItem = getExceptionListItemSchemaMock();
    exceptionItem.comments = getCommentsArrayMock();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionDetails
          showComments={false}
          onCommentsClick={jest.fn()}
          exceptionItem={exceptionItem}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find('.euiButtonEmpty[data-test-subj="exceptionsViewerItemCommentsBtn"]')
    ).toHaveLength(1);
  });

  test('it renders correct number of comments', () => {
    const exceptionItem = getExceptionListItemSchemaMock();
    exceptionItem.comments = [getCommentsArrayMock()[0]];
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionDetails
          showComments={false}
          onCommentsClick={jest.fn()}
          exceptionItem={exceptionItem}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="exceptionsViewerItemCommentsBtn"]').at(0).text()).toEqual(
      'Show (1) Comment'
    );
  });

  test('it renders comments plural if more than one', () => {
    const exceptionItem = getExceptionListItemSchemaMock();
    exceptionItem.comments = getCommentsArrayMock();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionDetails
          showComments={false}
          onCommentsClick={jest.fn()}
          exceptionItem={exceptionItem}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="exceptionsViewerItemCommentsBtn"]').at(0).text()).toEqual(
      'Show (2) Comments'
    );
  });

  test('it renders comments show text if "showComments" is false', () => {
    const exceptionItem = getExceptionListItemSchemaMock();
    exceptionItem.comments = getCommentsArrayMock();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionDetails
          showComments={false}
          onCommentsClick={jest.fn()}
          exceptionItem={exceptionItem}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="exceptionsViewerItemCommentsBtn"]').at(0).text()).toEqual(
      'Show (2) Comments'
    );
  });

  test('it renders comments hide text if "showComments" is true', () => {
    const exceptionItem = getExceptionListItemSchemaMock();
    exceptionItem.comments = getCommentsArrayMock();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionDetails
          showComments={true}
          onCommentsClick={jest.fn()}
          exceptionItem={exceptionItem}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="exceptionsViewerItemCommentsBtn"]').at(0).text()).toEqual(
      'Hide (2) Comments'
    );
  });

  test('it invokes "onCommentsClick" when comments button clicked', () => {
    const mockOnCommentsClick = jest.fn();
    const exceptionItem = getExceptionListItemSchemaMock();
    exceptionItem.comments = getCommentsArrayMock();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionDetails
          showComments={true}
          onCommentsClick={mockOnCommentsClick}
          exceptionItem={exceptionItem}
        />
      </ThemeProvider>
    );
    const commentsBtn = wrapper.find('[data-test-subj="exceptionsViewerItemCommentsBtn"]').at(0);
    commentsBtn.simulate('click');

    expect(mockOnCommentsClick).toHaveBeenCalledTimes(1);
  });

  test('it renders the operating system if one is specified in the exception item', () => {
    const exceptionItem = getExceptionListItemSchemaMock();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionDetails
          showComments={true}
          onCommentsClick={jest.fn()}
          exceptionItem={exceptionItem}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('EuiDescriptionListTitle').at(0).text()).toEqual('OS');
    expect(wrapper.find('EuiDescriptionListDescription').at(0).text()).toEqual('Linux');
  });

  test('it renders the exception item creator', () => {
    const exceptionItem = getExceptionListItemSchemaMock();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionDetails
          showComments={true}
          onCommentsClick={jest.fn()}
          exceptionItem={exceptionItem}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('EuiDescriptionListTitle').at(1).text()).toEqual('Date created');
    expect(wrapper.find('EuiDescriptionListDescription').at(1).text()).toEqual(
      'April 23rd 2020 @ 00:19:13'
    );
  });

  test('it renders the exception item creation timestamp', () => {
    const exceptionItem = getExceptionListItemSchemaMock();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionDetails
          showComments={true}
          onCommentsClick={jest.fn()}
          exceptionItem={exceptionItem}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('EuiDescriptionListTitle').at(2).text()).toEqual('Created by');
    expect(wrapper.find('EuiDescriptionListDescription').at(2).text()).toEqual('user_name');
  });

  test('it renders the description if one is included on the exception item', () => {
    const exceptionItem = getExceptionListItemSchemaMock();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionDetails
          showComments={true}
          onCommentsClick={jest.fn()}
          exceptionItem={exceptionItem}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('EuiDescriptionListTitle').at(3).text()).toEqual('Comment');
    expect(wrapper.find('EuiDescriptionListDescription').at(3).text()).toEqual(
      'This is a sample endpoint type exception'
    );
  });
});
