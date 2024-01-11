/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import '../../common/mock/match_media';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer, readCasesPermissions, TestProviders } from '../../common/mock';
import type { EditableTitleProps } from './editable_title';
import { EditableTitle } from './editable_title';
import { useMountAppended } from '../../utils/use_mount_appended';

describe('EditableTitle', () => {
  const mount = useMountAppended();
  const submitTitle = jest.fn();
  const defaultProps: EditableTitleProps = {
    title: 'Test title',
    onSubmit: submitTitle,
    isLoading: false,
  };

  let appMock: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMock = createAppMockRenderer();
  });

  it('renders', () => {
    const renderResult = appMock.render(<EditableTitle {...defaultProps} />);
    expect(renderResult.getByText('Test title')).toBeInTheDocument();
  });

  it('inline edit defaults to readOnly when the user does not have the edit permissions', () => {
    const wrapper = mount(
      <TestProviders permissions={readCasesPermissions()}>
        <EditableTitle {...defaultProps} />
      </TestProviders>
    );

    expect(
      wrapper.find('button[data-test-subj="editable-title-header-value"]').prop('disabled')
    ).toBe(true);
  });

  it('shows the edit title input field', () => {
    const wrapper = mount(
      <TestProviders>
        <EditableTitle {...defaultProps} />
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="editable-title-header-value"]').simulate('click');
    wrapper.update();

    expect(wrapper.find('[data-test-subj="editable-title-input-field"]').first().exists()).toBe(
      true
    );
  });

  it('shows the submit button', () => {
    const wrapper = mount(
      <TestProviders>
        <EditableTitle {...defaultProps} />
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="editable-title-header-value"]').simulate('click');
    wrapper.update();

    expect(
      wrapper.find('button[data-test-subj="editable-title-submit-btn"]').first().exists()
    ).toBe(true);
  });

  it('shows the cancel button', () => {
    const wrapper = mount(
      <TestProviders>
        <EditableTitle {...defaultProps} />
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="editable-title-header-value"]').simulate('click');
    wrapper.update();

    expect(
      wrapper.find('button[data-test-subj="editable-title-cancel-btn"]').first().exists()
    ).toBe(true);
  });

  it('switch to non edit mode when canceled', () => {
    const wrapper = mount(
      <TestProviders>
        <EditableTitle {...defaultProps} />
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="editable-title-header-value"]').simulate('click');
    wrapper.update();
    wrapper.find('button[data-test-subj="editable-title-cancel-btn"]').simulate('click');

    expect(
      wrapper.find('button[data-test-subj="editable-title-header-value"]').first().exists()
    ).toBe(true);
  });

  it('should change the title', () => {
    const newTitle = 'new test title';

    const wrapper = mount(
      <TestProviders>
        <EditableTitle {...defaultProps} />
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="editable-title-header-value"]').simulate('click');
    wrapper.update();

    wrapper
      .find('input[data-test-subj="editable-title-input-field"]')
      .simulate('change', { target: { value: newTitle } });

    wrapper.update();

    expect(
      wrapper.find('input[data-test-subj="editable-title-input-field"]').prop('value')
    ).toEqual(newTitle);
  });

  it('should NOT change the title when cancel', () => {
    const title = 'Test title';
    const newTitle = 'new test title';

    const wrapper = mount(
      <TestProviders>
        <EditableTitle {...{ ...defaultProps, title }} />
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="editable-title-header-value"]').simulate('click');
    wrapper.update();

    wrapper
      .find('input[data-test-subj="editable-title-input-field"]')

      .simulate('change', { target: { value: newTitle } });
    wrapper.update();

    wrapper.find('button[data-test-subj="editable-title-cancel-btn"]').simulate('click');
    wrapper.update();

    expect(wrapper.find('button[data-test-subj="editable-title-header-value"]').text()).toEqual(
      title
    );
  });

  it('submits the title', () => {
    const newTitle = 'new test title';

    const wrapper = mount(
      <TestProviders>
        <EditableTitle {...defaultProps} />
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="editable-title-header-value"]').simulate('click');
    wrapper.update();

    wrapper
      .find('input[data-test-subj="editable-title-input-field"]')
      .last()
      .simulate('change', { target: { value: newTitle } });

    wrapper.find('button[data-test-subj="editable-title-submit-btn"]').simulate('click');
    wrapper.update();

    expect(submitTitle).toHaveBeenCalled();
    expect(submitTitle.mock.calls[0][0]).toEqual(newTitle);
    expect(
      wrapper.find('button[data-test-subj="editable-title-header-value"]').first().exists()
    ).toBe(true);
  });

  it('trims the title before submit', () => {
    const newTitle = 'new test title with spaces          ';

    const wrapper = mount(
      <TestProviders>
        <EditableTitle {...defaultProps} />
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="editable-title-header-value"]').simulate('click');
    wrapper.update();

    wrapper
      .find('input[data-test-subj="editable-title-input-field"]')
      .last()
      .simulate('change', { target: { value: newTitle } });

    wrapper.find('button[data-test-subj="editable-title-submit-btn"]').simulate('click');
    wrapper.update();

    expect(submitTitle).toHaveBeenCalled();
    expect(submitTitle.mock.calls[0][0]).toEqual(newTitle.trim());
    expect(
      wrapper.find('button[data-test-subj="editable-title-header-value"]').first().exists()
    ).toBe(true);
  });

  it('does not submit the title when the length is longer than 160 characters', () => {
    const longTitle = 'a'.repeat(161);

    const wrapper = mount(
      <TestProviders>
        <EditableTitle {...defaultProps} />
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="editable-title-header-value"]').simulate('click');
    wrapper.update();

    wrapper
      .find('input[data-test-subj="editable-title-input-field"]')
      .simulate('change', { target: { value: longTitle } });

    wrapper.find('button[data-test-subj="editable-title-submit-btn"]').simulate('click');
    wrapper.update();
    expect(wrapper.find('.euiFormErrorText').text()).toBe(
      'The length of the title is too long. The maximum length is 160 characters.'
    );

    expect(submitTitle).not.toHaveBeenCalled();
    expect(
      wrapper.find('button[data-test-subj="editable-title-header-value"]').first().exists()
    ).toBe(false);
  });

  it('does not submit the title is empty', () => {
    const wrapper = mount(
      <TestProviders>
        <EditableTitle {...defaultProps} />
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="editable-title-header-value"]').simulate('click');
    wrapper.update();

    wrapper
      .find('input[data-test-subj="editable-title-input-field"]')

      .simulate('change', { target: { value: '' } });

    wrapper.find('button[data-test-subj="editable-title-submit-btn"]').simulate('click');
    wrapper.update();
    expect(wrapper.find('.euiFormErrorText').text()).toBe('A name is required.');

    expect(submitTitle).not.toHaveBeenCalled();
    expect(
      wrapper.find('button[data-test-subj="editable-title-header-value"]').first().exists()
    ).toBe(false);
  });

  it('does not show an error after a previous edit error was displayed', () => {
    const longTitle = 'a'.repeat(161);

    const shortTitle = 'My title';
    const wrapper = mount(
      <TestProviders>
        <EditableTitle {...defaultProps} />
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="editable-title-header-value"]').simulate('click');
    wrapper.update();

    // simualte a long title
    wrapper
      .find('input[data-test-subj="editable-title-input-field"]')
      .simulate('change', { target: { value: longTitle } });

    wrapper.find('button[data-test-subj="editable-title-submit-btn"]').simulate('click');
    wrapper.update();
    expect(wrapper.find('.euiFormErrorText').text()).toBe(
      'The length of the title is too long. The maximum length is 160 characters.'
    );

    // write a shorter one
    wrapper
      .find('input[data-test-subj="editable-title-input-field"]')

      .simulate('change', { target: { value: shortTitle } });
    wrapper.update();

    // submit the form
    wrapper.find('button[data-test-subj="editable-title-submit-btn"]').simulate('click');
    wrapper.update();

    // edit again
    wrapper.find('button[data-test-subj="editable-title-header-value"]').simulate('click');
    wrapper.update();

    // no error should appear
    expect(wrapper.find('.euiFormErrorText').length).toBe(0);
  });

  describe('Badges', () => {
    it('does not render the badge if the release is ga', () => {
      const renderResult = appMock.render(<EditableTitle {...defaultProps} />);

      expect(renderResult.getByText('Test title')).toBeInTheDocument();
      expect(renderResult.queryByText('Beta')).toBeFalsy();
      expect(renderResult.queryByText('Technical preview')).toBeFalsy();
    });

    it('does render the beta badge', () => {
      appMock = createAppMockRenderer({ releasePhase: 'beta' });
      const renderResult = appMock.render(<EditableTitle {...defaultProps} />);

      expect(renderResult.getByText('Test title')).toBeInTheDocument();
      expect(renderResult.getByText('Beta')).toBeInTheDocument();
    });

    it('does render the experimental badge', () => {
      appMock = createAppMockRenderer({ releasePhase: 'experimental' });
      const renderResult = appMock.render(<EditableTitle {...defaultProps} />);

      expect(renderResult.getByText('Test title')).toBeInTheDocument();
      expect(renderResult.getByText('Technical preview')).toBeInTheDocument();
    });
  });
});
