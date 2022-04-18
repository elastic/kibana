/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { TagList, TagListProps } from '.';
import { getFormMock } from '../__mock__/form';
import { TestProviders } from '../../common/mock';
import { waitFor } from '@testing-library/react';
import { useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib/hooks/use_form';
import { useGetTags } from '../../containers/use_get_tags';

jest.mock('@kbn/es-ui-shared-plugin/static/forms/hook_form_lib/hooks/use_form');
jest.mock('../../containers/use_get_tags');
jest.mock(
  '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib/components/form_data_provider',
  () => ({
    FormDataProvider: ({ children }: { children: ({ tags }: { tags: string[] }) => void }) =>
      children({ tags: ['rad', 'dude'] }),
  })
);
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiFieldText: () => <input />,
  };
});
const onSubmit = jest.fn();
const defaultProps: TagListProps = {
  userCanCrud: true,
  isLoading: false,
  onSubmit,
  tags: [],
};

describe('TagList ', () => {
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
    wrapper.find(`[data-test-subj="edit-tags-submit"]`).last().simulate('click');
    await waitFor(() => expect(onSubmit).toBeCalledWith(sampleTags));
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

  it('Cancels on cancel', () => {
    const props = {
      ...defaultProps,
      tags: ['pepsi'],
    };
    const wrapper = mount(
      <TestProviders>
        <TagList {...props} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="tag-pepsi"]`).last().exists()).toBeTruthy();
    wrapper.find(`[data-test-subj="tag-list-edit-button"]`).last().simulate('click');

    expect(wrapper.find(`[data-test-subj="tag-pepsi"]`).last().exists()).toBeFalsy();
    wrapper.find(`[data-test-subj="edit-tags-cancel"]`).last().simulate('click');
    wrapper.update();
    expect(wrapper.find(`[data-test-subj="tag-pepsi"]`).last().exists()).toBeTruthy();
  });

  it('does not render when the user does not have write permissions', () => {
    const props = { ...defaultProps, userCanCrud: false };
    const wrapper = mount(
      <TestProviders>
        <TagList {...props} />
      </TestProviders>
    );
    expect(wrapper.find(`[data-test-subj="tag-list-edit"]`).exists()).toBeFalsy();
  });
});
