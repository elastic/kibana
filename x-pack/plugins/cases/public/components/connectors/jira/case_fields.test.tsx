/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { omit } from 'lodash/fp';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useKibana } from '../../../common/lib/kibana';
import { connector, issues } from '../mock';
import { useGetIssueTypes } from './use_get_issue_types';
import { useGetFieldsByIssueType } from './use_get_fields_by_issue_type';
import Fields from './case_fields';
import { useGetSingleIssue } from './use_get_single_issue';
import { useGetIssues } from './use_get_issues';
import { EuiComboBox } from '@elastic/eui';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';

jest.mock('./use_get_issue_types');
jest.mock('./use_get_fields_by_issue_type');
jest.mock('./use_get_single_issue');
jest.mock('./use_get_issues');
jest.mock('../../../common/lib/kibana');
const useGetIssueTypesMock = useGetIssueTypes as jest.Mock;
const useGetFieldsByIssueTypeMock = useGetFieldsByIssueType as jest.Mock;
const useGetSingleIssueMock = useGetSingleIssue as jest.Mock;
const useGetIssuesMock = useGetIssues as jest.Mock;
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('Jira Fields', () => {
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

  const useGetSingleIssueResponse = {
    isLoading: false,
    issue: { title: 'Parent Task', key: 'parentId' },
  };

  const fields = {
    issueType: '10006',
    priority: 'High',
    parent: null,
  };

  const useGetIssuesResponse = {
    isLoading: false,
    issues,
  };

  const onChange = jest.fn();
  let mockedContext: AppMockRenderer;

  beforeEach(() => {
    mockedContext = createAppMockRenderer();
    useGetIssueTypesMock.mockReturnValue(useGetIssueTypesResponse);
    useGetFieldsByIssueTypeMock.mockReturnValue(useGetFieldsByIssueTypeResponse);
    useGetSingleIssueMock.mockReturnValue(useGetSingleIssueResponse);
    useKibanaMock().services.triggersActionsUi.actionTypeRegistry.get = jest.fn().mockReturnValue({
      actionTypeTitle: '.jira',
      iconClass: 'logoSecurity',
    });
    jest.clearAllMocks();
  });

  test('all params fields are rendered - isEdit: true', () => {
    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);
    expect(wrapper.find('[data-test-subj="issueTypeSelect"]').first().prop('value')).toStrictEqual(
      '10006'
    );
    expect(wrapper.find('[data-test-subj="prioritySelect"]').first().prop('value')).toStrictEqual(
      'High'
    );
    expect(wrapper.find('[data-test-subj="search-parent-issues"]').first().exists()).toBeFalsy();
  });

  test('all params fields are rendered - isEdit: false', () => {
    const wrapper = mount(
      <Fields
        isEdit={false}
        fields={{ ...fields, parent: 'Parent Task' }}
        onChange={onChange}
        connector={connector}
      />
    );

    const nodes = wrapper.find('[data-test-subj="card-list-item"]').hostNodes();

    expect(nodes.at(0).text()).toEqual('Issue type: Task');
    expect(nodes.at(1).text()).toEqual('Parent issue: Parent Task');
    expect(nodes.at(2).text()).toEqual('Priority: High');
  });

  test('it sets parent correctly', async () => {
    useGetFieldsByIssueTypeMock.mockReturnValue({
      ...useGetFieldsByIssueTypeResponse,
      fields: {
        ...useGetFieldsByIssueTypeResponse.fields,
        parent: {},
      },
    });
    useGetIssuesMock.mockReturnValue(useGetIssuesResponse);
    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);

    await waitFor(() =>
      (
        wrapper.find(EuiComboBox).props() as unknown as {
          onChange: (a: EuiComboBoxOptionOption[]) => void;
        }
      ).onChange([{ label: 'parentId', value: 'parentId' }])
    );
    wrapper.update();
    expect(onChange).toHaveBeenCalledWith({
      issueType: '10006',
      parent: 'parentId',
      priority: 'High',
    });
  });

  test('it searches parent correctly', async () => {
    useGetFieldsByIssueTypeMock.mockReturnValue({
      ...useGetFieldsByIssueTypeResponse,
      fields: {
        ...useGetFieldsByIssueTypeResponse.fields,
        parent: {},
      },
    });
    useGetSingleIssueMock.mockReturnValue({ useGetSingleIssueResponse, issue: null });
    useGetIssuesMock.mockReturnValue(useGetIssuesResponse);
    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);

    await waitFor(() =>
      (
        wrapper.find(EuiComboBox).props() as unknown as {
          onSearchChange: (a: string) => void;
        }
      ).onSearchChange('womanId')
    );
    wrapper.update();
    expect(useGetIssuesMock.mock.calls[2][0].query).toEqual('womanId');
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

  test('it sets issue type correctly', () => {
    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);

    wrapper
      .find('select[data-test-subj="issueTypeSelect"]')
      .first()
      .simulate('change', {
        target: { value: '10007' },
      });

    expect(onChange).toHaveBeenCalledWith({ issueType: '10007', parent: null, priority: null });
  });

  test('it sets issue type when it comes as null', () => {
    const wrapper = mount(
      <Fields fields={{ ...fields, issueType: null }} onChange={onChange} connector={connector} />
    );
    expect(wrapper.find('select[data-test-subj="issueTypeSelect"]').first().props().value).toEqual(
      '10006'
    );
  });

  test('it sets issue type when it comes as unknown value', () => {
    const wrapper = mount(
      <Fields
        fields={{ ...fields, issueType: '99999' }}
        onChange={onChange}
        connector={connector}
      />
    );
    expect(wrapper.find('select[data-test-subj="issueTypeSelect"]').first().props().value).toEqual(
      '10006'
    );
  });

  test('it sets priority correctly', () => {
    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);

    wrapper
      .find('select[data-test-subj="prioritySelect"]')
      .first()
      .simulate('change', {
        target: { value: '2' },
      });

    expect(onChange).toHaveBeenCalledWith({ issueType: '10006', parent: null, priority: '2' });
  });

  test('it resets priority when changing issue type', () => {
    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);
    wrapper
      .find('select[data-test-subj="issueTypeSelect"]')
      .first()
      .simulate('change', {
        target: { value: '10007' },
      });

    expect(onChange).toBeCalledWith({ issueType: '10007', parent: null, priority: null });
  });

  it('should submit Jira connector', async () => {
    const { rerender } = mockedContext.render(
      <Fields fields={fields} onChange={onChange} connector={connector} />
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Bug' }));
      expect(screen.getByRole('option', { name: 'Low' }));
    });

    userEvent.selectOptions(screen.getByTestId('issueTypeSelect'), ['10007']);

    rerender(
      <Fields
        fields={{ ...fields, issueType: '10007' }}
        onChange={onChange}
        connector={connector}
      />
    );

    userEvent.selectOptions(screen.getByTestId('prioritySelect'), ['Low']);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });

    expect(onChange).toBeCalledWith({
      issueType: '10007',
      parent: null,
      priority: 'Low',
    });
  });
});
