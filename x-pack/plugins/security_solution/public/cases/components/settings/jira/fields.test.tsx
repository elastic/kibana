/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { omit } from 'lodash/fp';

import { connector } from '../mock';
import { useGetIssueTypes } from './use_get_issue_types';
import { useGetFieldsByIssueType } from './use_get_fields_by_issue_type';
import Fields from './fields';

jest.mock('../../../../common/lib/kibana');
jest.mock('./use_get_issue_types');
jest.mock('./use_get_fields_by_issue_type');

const useGetIssueTypesMock = useGetIssueTypes as jest.Mock;
const useGetFieldsByIssueTypeMock = useGetFieldsByIssueType as jest.Mock;

describe('JiraParamsFields renders', () => {
  const useGetIssueTypesResponse = {
    isLoading: false,
    issueTypes: [
      {
        id: '10006',
        name: 'Task',
      },
      {
        id: '10007',
        name: 'Bug',
      },
    ],
  };

  const useGetFieldsByIssueTypeResponse = {
    isLoading: false,
    fields: {
      summary: { allowedValues: [], defaultValue: {} },
      labels: { allowedValues: [], defaultValue: {} },
      description: { allowedValues: [], defaultValue: {} },
      priority: {
        allowedValues: [
          {
            name: 'Medium',
            id: '3',
          },
          {
            name: 'Low',
            id: '2',
          },
        ],
        defaultValue: { name: 'Medium', id: '3' },
      },
    },
  };

  const fields = {
    issueType: '10006',
    priority: 'High',
    parent: null,
  };

  const onChange = jest.fn();

  beforeEach(() => {
    useGetIssueTypesMock.mockReturnValue(useGetIssueTypesResponse);
    useGetFieldsByIssueTypeMock.mockReturnValue(useGetFieldsByIssueTypeResponse);
    jest.clearAllMocks();
  });

  test('all params fields are rendered', () => {
    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);
    expect(wrapper.find('[data-test-subj="issueTypeSelect"]').first().prop('value')).toStrictEqual(
      '10006'
    );
    expect(wrapper.find('[data-test-subj="prioritySelect"]').first().prop('value')).toStrictEqual(
      'High'
    );
  });

  test('it disabled the fields when loading issue types', () => {
    useGetIssueTypesMock.mockReturnValue({ ...useGetIssueTypesResponse, isLoading: true });

    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);

    expect(
      wrapper.find('[data-test-subj="issueTypeSelect"]').first().prop('disabled')
    ).toBeTruthy();
    expect(wrapper.find('[data-test-subj="prioritySelect"]').first().prop('disabled')).toBeTruthy();
  });

  test('it disabled the fields when loading fields', () => {
    useGetFieldsByIssueTypeMock.mockReturnValue({
      ...useGetFieldsByIssueTypeResponse,
      isLoading: true,
    });

    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);

    expect(
      wrapper.find('[data-test-subj="issueTypeSelect"]').first().prop('disabled')
    ).toBeTruthy();
    expect(wrapper.find('[data-test-subj="prioritySelect"]').first().prop('disabled')).toBeTruthy();
  });

  test('it hides the priority if not supported', () => {
    const response = omit('fields.priority', useGetFieldsByIssueTypeResponse);

    useGetFieldsByIssueTypeMock.mockReturnValue(response);

    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);

    expect(wrapper.find('[data-test-subj="prioritySelect"]').first().exists()).toBeFalsy();
  });

  test('it sets issue type correctly', async () => {
    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);

    wrapper
      .find('select[data-test-subj="issueTypeSelect"]')
      .first()
      .simulate('change', {
        target: { value: '10007' },
      });

    expect(onChange).toHaveBeenCalledWith({ issueType: '10007', parent: null, priority: null });
  });

  test('it sets priority correctly', async () => {
    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);

    wrapper
      .find('select[data-test-subj="prioritySelect"]')
      .first()
      .simulate('change', {
        target: { value: '2' },
      });

    expect(onChange).toHaveBeenCalledWith({ issueType: '10006', parent: null, priority: '2' });
  });

  test('it resets priority when changing issue type', async () => {
    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);
    wrapper
      .find('select[data-test-subj="issueTypeSelect"]')
      .first()
      .simulate('change', {
        target: { value: '10007' },
      });

    expect(onChange).toBeCalledWith({ issueType: '10007', parent: null, priority: null });
  });
});
