/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { TagList } from '.';
import { getFormMock } from '../__mock__/form';
import { TestProviders } from '../../../common/mock';
import { waitFor } from '@testing-library/react';
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
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    // eslint-disable-next-line react/display-name
    EuiFieldText: () => <input />,
  };
});
const onSubmit = jest.fn();
const defaultProps = {
  disabled: false,
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
