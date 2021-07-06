/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';

import '../../common/mock/match_media';
import { TestProviders } from '../../common/mock';
import { EditableTitle, EditableTitleProps } from './editable_title';
import { useMountAppended } from '../../utils/use_mount_appended';

describe('EditableTitle', () => {
  const mount = useMountAppended();
  const submitTitle = jest.fn();
  const defaultProps: EditableTitleProps = {
    title: 'Test title',
    onSubmit: submitTitle,
    isLoading: false,
    userCanCrud: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it renders', () => {
    const wrapper = shallow(<EditableTitle {...defaultProps} />);

    expect(wrapper).toMatchSnapshot();
  });

  test('it does not show the edit icon when the user does not have edit permissions', () => {
    const wrapper = mount(
      <TestProviders>
        <EditableTitle {...{ ...defaultProps, userCanCrud: false }} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="editable-title-edit-icon"]').exists()).toBeFalsy();
  });

  test('it shows the edit title input field', () => {
    const wrapper = mount(
      <TestProviders>
        <EditableTitle {...defaultProps} />
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="editable-title-edit-icon"]').simulate('click');
    wrapper.update();

    expect(wrapper.find('[data-test-subj="editable-title-input-field"]').first().exists()).toBe(
      true
    );
  });

  test('it shows the submit button', () => {
    const wrapper = mount(
      <TestProviders>
        <EditableTitle {...defaultProps} />
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="editable-title-edit-icon"]').simulate('click');
    wrapper.update();

    expect(wrapper.find('[data-test-subj="editable-title-submit-btn"]').first().exists()).toBe(
      true
    );
  });

  test('it shows the cancel button', () => {
    const wrapper = mount(
      <TestProviders>
        <EditableTitle {...defaultProps} />
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="editable-title-edit-icon"]').simulate('click');
    wrapper.update();

    expect(wrapper.find('[data-test-subj="editable-title-cancel-btn"]').first().exists()).toBe(
      true
    );
  });

  test('it DOES NOT shows the edit icon when in edit mode', () => {
    const wrapper = mount(
      <TestProviders>
        <EditableTitle {...defaultProps} />
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="editable-title-edit-icon"]').simulate('click');
    wrapper.update();

    expect(wrapper.find('[data-test-subj="editable-title-edit-icon"]').first().exists()).toBe(
      false
    );
  });

  test('it switch to non edit mode when canceled', () => {
    const wrapper = mount(
      <TestProviders>
        <EditableTitle {...defaultProps} />
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="editable-title-edit-icon"]').simulate('click');
    wrapper.update();
    wrapper.find('button[data-test-subj="editable-title-cancel-btn"]').simulate('click');

    expect(wrapper.find('[data-test-subj="editable-title-edit-icon"]').first().exists()).toBe(true);
  });

  test('it should change the title', () => {
    const newTitle = 'new test title';

    const wrapper = mount(
      <TestProviders>
        <EditableTitle {...defaultProps} />
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="editable-title-edit-icon"]').simulate('click');
    wrapper.update();

    wrapper
      .find('input[data-test-subj="editable-title-input-field"]')
      .simulate('change', { target: { value: newTitle } });

    wrapper.update();

    expect(
      wrapper.find('input[data-test-subj="editable-title-input-field"]').prop('value')
    ).toEqual(newTitle);
  });

  test('it should NOT change the title when cancel', () => {
    const title = 'Test title';
    const newTitle = 'new test title';

    const wrapper = mount(
      <TestProviders>
        <EditableTitle {...{ ...defaultProps, title }} />
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="editable-title-edit-icon"]').simulate('click');
    wrapper.update();

    wrapper
      .find('input[data-test-subj="editable-title-input-field"]')
      .simulate('change', { target: { value: newTitle } });
    wrapper.update();

    wrapper.find('button[data-test-subj="editable-title-cancel-btn"]').simulate('click');
    wrapper.update();

    expect(wrapper.find('h1[data-test-subj="header-page-title"]').text()).toEqual(title);
  });

  test('it submits the title', () => {
    const newTitle = 'new test title';

    const wrapper = mount(
      <TestProviders>
        <EditableTitle {...defaultProps} />
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="editable-title-edit-icon"]').simulate('click');
    wrapper.update();

    wrapper
      .find('input[data-test-subj="editable-title-input-field"]')
      .simulate('change', { target: { value: newTitle } });

    wrapper.find('button[data-test-subj="editable-title-submit-btn"]').simulate('click');
    wrapper.update();

    expect(submitTitle).toHaveBeenCalled();
    expect(submitTitle.mock.calls[0][0]).toEqual(newTitle);
    expect(wrapper.find('[data-test-subj="editable-title-edit-icon"]').first().exists()).toBe(true);
  });

  test('it does not submits the title when the length is longer than 64 characters', () => {
    const longTitle =
      'This is a title that should not be saved as it is longer than 64 characters.';

    const wrapper = mount(
      <TestProviders>
        <EditableTitle {...defaultProps} />
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="editable-title-edit-icon"]').simulate('click');
    wrapper.update();

    wrapper
      .find('input[data-test-subj="editable-title-input-field"]')
      .simulate('change', { target: { value: longTitle } });

    wrapper.find('button[data-test-subj="editable-title-submit-btn"]').simulate('click');
    wrapper.update();
    expect(wrapper.find('.euiFormErrorText').text()).toBe(
      'The length of the title is too long. The maximum length is 64.'
    );

    expect(submitTitle).not.toHaveBeenCalled();
    expect(wrapper.find('[data-test-subj="editable-title-edit-icon"]').first().exists()).toBe(
      false
    );
  });
});
