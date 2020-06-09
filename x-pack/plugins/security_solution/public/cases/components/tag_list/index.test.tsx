/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { act } from 'react-dom/test-utils';

import { TagList } from '.';
import { getFormMock } from '../__mock__/form';
import { TestProviders } from '../../../common/mock';
import { wait } from '../../../common/lib/helpers';
import { useForm } from '../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/hooks/use_form';
import { useGetTags } from '../../containers/use_get_tags';

jest.mock(
  '../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/hooks/use_form'
);
jest.mock('../../containers/use_get_tags');
jest.mock(
  '../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/components/form_data_provider',
  () => ({
    FormDataProvider: ({ children }: { children: ({ tags }: { tags: string[] }) => void }) =>
      children({ tags: ['rad', 'dude'] }),
  })
);
const onSubmit = jest.fn();
const defaultProps = {
  disabled: false,
  isLoading: false,
  onSubmit,
  tags: [],
};

describe('TagList ', () => {
  // Suppress warnings about "noSuggestions" prop
  /* eslint-disable no-console */
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });
  /* eslint-enable no-console */
  const sampleTags = ['coke', 'pepsi'];
  const fetchTags = jest.fn();
  const formHookMock = getFormMock({ tags: sampleTags });
  beforeEach(() => {
    jest.resetAllMocks();
    (useForm as jest.Mock).mockImplementation(() => ({ form: formHookMock }));

    (useGetTags as jest.Mock).mockImplementation(() => ({
      tags: sampleTags,
      fetchTags,
    }));
  });
  it('Renders no tags, and then edit', () => {
    const wrapper = mount(
      <TestProviders>
        <TagList {...defaultProps} />
      </TestProviders>
    );
    expect(wrapper.find(`[data-test-subj="no-tags"]`).last().exists()).toBeTruthy();
    wrapper.find(`[data-test-subj="tag-list-edit-button"]`).last().simulate('click');
    expect(wrapper.find(`[data-test-subj="no-tags"]`).last().exists()).toBeFalsy();
    expect(wrapper.find(`[data-test-subj="edit-tags"]`).last().exists()).toBeTruthy();
  });
  it('Edit tag on submit', async () => {
    const wrapper = mount(
      <TestProviders>
        <TagList {...defaultProps} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="tag-list-edit-button"]`).last().simulate('click');
    await act(async () => {
      wrapper.find(`[data-test-subj="edit-tags-submit"]`).last().simulate('click');
      await wait();
      expect(onSubmit).toBeCalledWith(sampleTags);
    });
  });
  it('Tag options render with new tags added', () => {
    const wrapper = mount(
      <TestProviders>
        <TagList {...defaultProps} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="tag-list-edit-button"]`).last().simulate('click');
    expect(
      wrapper.find(`[data-test-subj="caseTags"] [data-test-subj="input"]`).first().prop('options')
    ).toEqual([{ label: 'coke' }, { label: 'pepsi' }, { label: 'rad' }, { label: 'dude' }]);
  });
  it('Cancels on cancel', async () => {
    const props = {
      ...defaultProps,
      tags: ['pepsi'],
    };
    const wrapper = mount(
      <TestProviders>
        <TagList {...props} />
      </TestProviders>
    );
    expect(wrapper.find(`[data-test-subj="case-tag"]`).last().exists()).toBeTruthy();
    wrapper.find(`[data-test-subj="tag-list-edit-button"]`).last().simulate('click');
    await act(async () => {
      expect(wrapper.find(`[data-test-subj="case-tag"]`).last().exists()).toBeFalsy();
      wrapper.find(`[data-test-subj="edit-tags-cancel"]`).last().simulate('click');
      await wait();
      wrapper.update();
      expect(wrapper.find(`[data-test-subj="case-tag"]`).last().exists()).toBeTruthy();
    });
  });
  it('Renders disabled button', () => {
    const props = { ...defaultProps, disabled: true };
    const wrapper = mount(
      <TestProviders>
        <TagList {...props} />
      </TestProviders>
    );
    expect(
      wrapper.find(`[data-test-subj="tag-list-edit-button"]`).last().prop('disabled')
    ).toBeTruthy();
  });
});
