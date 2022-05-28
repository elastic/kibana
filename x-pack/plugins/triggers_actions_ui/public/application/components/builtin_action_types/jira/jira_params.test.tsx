/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import JiraParamsFields from './jira_params';
import { useGetIssueTypes } from './use_get_issue_types';
import { useGetFieldsByIssueType } from './use_get_fields_by_issue_type';
import { ActionConnector } from '../../../../types';
import { EuiComboBoxOptionOption } from '@elastic/eui';
jest.mock('../../../../common/lib/kibana');

jest.mock('./use_get_issue_types');
jest.mock('./use_get_fields_by_issue_type');
jest.mock('./search_issues');

const useGetIssueTypesMock = useGetIssueTypes as jest.Mock;
const useGetFieldsByIssueTypeMock = useGetFieldsByIssueType as jest.Mock;

const actionParams = {
  subAction: 'pushToService',
  subActionParams: {
    incident: {
      summary: 'sn title',
      description: 'some description',
      issueType: '10006',
      labels: ['kibana'],
      priority: 'High',
      externalId: null,
      parent: null,
    },
    comments: [],
  },
};

const connector: ActionConnector = {
  secrets: {},
  config: {},
  id: 'test',
  actionTypeId: '.test',
  name: 'Test',
  isPreconfigured: false,
  isDeprecated: false,
};
const editAction = jest.fn();
const defaultProps = {
  actionConnector: connector,
  actionParams,
  editAction,
  errors: { 'subActionParams.incident.summary': [] },
  index: 0,
  messageVariables: [],
};

describe('JiraParamsFields renders', () => {
  const useGetIssueTypesResponse = {
    isLoading: false,
    issueTypes: [
      {
        id: '10005',
        name: 'Task',
      },
      {
        id: '10006',
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
        ],
        defaultValue: { name: 'Medium', id: '3' },
      },
    },
  };
  const useGetFieldsByIssueTypeResponseNoPriority = {
    ...useGetFieldsByIssueTypeResponse,
    fields: {
      summary: { allowedValues: [], defaultValue: {} },
      labels: { allowedValues: [], defaultValue: {} },
      description: { allowedValues: [], defaultValue: {} },
    },
  };
  const useGetFieldsByIssueTypeResponseLoading = {
    isLoading: true,
    fields: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useGetIssueTypesMock.mockReturnValue(useGetIssueTypesResponse);
    useGetFieldsByIssueTypeMock.mockReturnValue(useGetFieldsByIssueTypeResponse);
  });

  test('all params fields are rendered', () => {
    const wrapper = mount(<JiraParamsFields {...defaultProps} />);
    expect(wrapper.find('[data-test-subj="issueTypeSelect"]').first().prop('value')).toStrictEqual(
      '10006'
    );
    expect(wrapper.find('[data-test-subj="prioritySelect"]').first().prop('value')).toStrictEqual(
      'High'
    );
    expect(wrapper.find('[data-test-subj="summaryInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="descriptionTextArea"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="labelsComboBox"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="commentsTextArea"]').length > 0).toBeTruthy();
  });

  test('it shows loading when loading issue types', () => {
    useGetIssueTypesMock.mockReturnValue({ ...useGetIssueTypesResponse, isLoading: true });
    const wrapper = mount(<JiraParamsFields {...defaultProps} />);

    expect(
      wrapper.find('[data-test-subj="issueTypeSelect"]').first().prop('isLoading')
    ).toBeTruthy();
  });

  test('it shows loading when loading fields', () => {
    useGetFieldsByIssueTypeMock.mockReturnValue({
      ...useGetFieldsByIssueTypeResponse,
      isLoading: true,
    });

    const wrapper = mount(<JiraParamsFields {...defaultProps} />);

    expect(
      wrapper.find('[data-test-subj="prioritySelect"]').first().prop('isLoading')
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="labelsComboBox"]').first().prop('isLoading')
    ).toBeTruthy();
  });

  test('it disabled the fields when loading issue types', () => {
    useGetIssueTypesMock.mockReturnValue({ ...useGetIssueTypesResponse, isLoading: true });

    const wrapper = mount(<JiraParamsFields {...defaultProps} />);

    expect(
      wrapper.find('[data-test-subj="issueTypeSelect"]').first().prop('disabled')
    ).toBeTruthy();
    expect(wrapper.find('[data-test-subj="prioritySelect"]').first().prop('disabled')).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="labelsComboBox"]').first().prop('isDisabled')
    ).toBeTruthy();
  });

  test('it disabled the fields when loading fields', () => {
    useGetFieldsByIssueTypeMock.mockReturnValue({
      ...useGetFieldsByIssueTypeResponse,
      isLoading: true,
    });

    const wrapper = mount(<JiraParamsFields {...defaultProps} />);

    expect(
      wrapper.find('[data-test-subj="issueTypeSelect"]').first().prop('disabled')
    ).toBeTruthy();
    expect(wrapper.find('[data-test-subj="prioritySelect"]').first().prop('disabled')).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="labelsComboBox"]').first().prop('isDisabled')
    ).toBeTruthy();
  });

  test('hide unsupported fields', () => {
    useGetIssueTypesMock.mockReturnValue(useGetIssueTypesResponse);
    useGetFieldsByIssueTypeMock.mockReturnValue({
      ...useGetFieldsByIssueTypeResponse,
      fields: {},
    });
    const wrapper = mount(<JiraParamsFields {...defaultProps} />);

    expect(wrapper.find('[data-test-subj="issueTypeSelect"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="summaryInput"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="commentsTextArea"]').exists()).toBeTruthy();

    expect(wrapper.find('[data-test-subj="prioritySelect"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="descriptionTextArea"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="labelsComboBox"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="search-parent-issues"]').exists()).toBeFalsy();
  });

  test('If issue type is undefined, set to first item in issueTypes', () => {
    const newProps = {
      ...defaultProps,
      actionParams: {
        ...actionParams,
        subActionParams: {
          ...actionParams.subActionParams,
          incident: {
            ...actionParams.subActionParams.incident,
            issueType: null,
          },
        },
      },
    };
    mount(<JiraParamsFields {...newProps} />);
    expect(editAction.mock.calls[0][1].incident.issueType).toEqual(
      useGetIssueTypesResponse.issueTypes[0].id
    );
  });

  test('If issue type is not an option in issueTypes, set to first item in issueTypes', () => {
    const newProps = {
      ...defaultProps,
      actionParams: {
        ...actionParams,
        subActionParams: {
          ...actionParams.subActionParams,
          incident: {
            ...actionParams.subActionParams.incident,
            issueType: '999',
          },
        },
      },
    };
    mount(<JiraParamsFields {...newProps} />);
    expect(editAction.mock.calls[0][1].incident.issueType).toEqual(
      useGetIssueTypesResponse.issueTypes[0].id
    );
  });

  test('When issueType and fields are null, return empty priority', () => {
    useGetFieldsByIssueTypeMock.mockReturnValue({
      ...useGetFieldsByIssueTypeResponse,
      fields: null,
    });
    const newProps = {
      ...defaultProps,
      actionParams: {
        ...actionParams,
        subActionParams: {
          ...actionParams.subActionParams,
          incident: {
            ...actionParams.subActionParams.incident,
            issueType: null,
          },
        },
      },
    };
    const wrapper = mount(<JiraParamsFields {...newProps} />);
    expect(wrapper.find('[data-test-subj="prioritySelect"]').exists()).toEqual(false);
  });
  test('If summary has errors, form row is invalid', () => {
    const newProps = {
      ...defaultProps,
      errors: { 'subActionParams.incident.summary': ['error'] },
    };
    const wrapper = mount(<JiraParamsFields {...newProps} />);
    const summary = wrapper.find('[data-test-subj="summary-row"]').first();
    expect(summary.prop('isInvalid')).toBeTruthy();
  });
  test('When subActionParams is undefined, set to default', () => {
    useGetIssueTypesMock.mockReturnValue({ ...useGetIssueTypesResponse, issueTypes: [] });
    const { subActionParams, ...newParams } = actionParams;

    const newProps = {
      ...defaultProps,
      actionParams: newParams,
    };
    mount(<JiraParamsFields {...newProps} />);
    expect(editAction.mock.calls[0][1]).toEqual({
      incident: {},
      comments: [],
    });
  });
  test('When subAction is undefined, set to default', () => {
    useGetIssueTypesMock.mockReturnValue({ ...useGetIssueTypesResponse, issueTypes: [] });
    const { subAction, ...newParams } = actionParams;

    const newProps = {
      ...defaultProps,
      actionParams: newParams,
    };
    mount(<JiraParamsFields {...newProps} />);
    expect(editAction.mock.calls[1][1]).toEqual('pushToService');
  });
  test('Resets fields when connector changes', () => {
    const wrapper = mount(<JiraParamsFields {...defaultProps} />);
    expect(editAction.mock.calls.length).toEqual(1);
    wrapper.setProps({ actionConnector: { ...connector, id: '1234' } });
    expect(editAction.mock.calls.length).toEqual(2);
    expect(editAction.mock.calls[1][1]).toEqual({
      incident: {},
      comments: [],
    });
  });
  describe('UI updates', () => {
    const changeEvent = { target: { value: 'Bug' } } as React.ChangeEvent<HTMLSelectElement>;
    const simpleFields = [
      { dataTestSubj: 'input[data-test-subj="summaryInput"]', key: 'summary' },
      { dataTestSubj: 'textarea[data-test-subj="descriptionTextArea"]', key: 'description' },
      { dataTestSubj: '[data-test-subj="issueTypeSelect"]', key: 'issueType' },
      { dataTestSubj: '[data-test-subj="prioritySelect"]', key: 'priority' },
    ];

    simpleFields.forEach((field) =>
      test(`${field.key} update triggers editAction :D`, () => {
        const wrapper = mount(<JiraParamsFields {...defaultProps} />);
        const theField = wrapper.find(field.dataTestSubj).first();
        theField.prop('onChange')!(changeEvent);
        expect(editAction.mock.calls[1][1].incident[field.key]).toEqual(changeEvent.target.value);
      })
    );

    test('Parent update triggers editAction', () => {
      useGetFieldsByIssueTypeMock.mockReturnValue({
        ...useGetFieldsByIssueTypeResponse,
        fields: {
          ...useGetFieldsByIssueTypeResponse.fields,
          parent: {},
        },
      });
      const newProps = {
        ...defaultProps,
        actionParams: {
          ...actionParams,
          subActionParams: {
            ...actionParams.subActionParams,
            incident: {
              ...actionParams.subActionParams.incident,
              parent: '10002',
            },
          },
        },
      };
      const wrapper = mount(<JiraParamsFields {...newProps} />);
      const parent = wrapper.find('[data-test-subj="parent-search"]');

      (
        parent.props() as unknown as {
          onChange: (val: string) => void;
        }
      ).onChange('Cool');
      expect(editAction.mock.calls[1][1].incident.parent).toEqual('Cool');
    });
    test('Label update triggers editAction', () => {
      const wrapper = mount(<JiraParamsFields {...defaultProps} />);
      const labels = wrapper.find('[data-test-subj="labelsComboBox"]');
      (
        labels.at(0).props() as unknown as {
          onChange: (a: EuiComboBoxOptionOption[]) => void;
        }
      ).onChange([{ label: 'Cool' }]);
      expect(editAction.mock.calls[1][1].incident.labels).toEqual(['Cool']);
    });
    test('Label undefined update triggers editAction', () => {
      const newProps = {
        ...defaultProps,
        actionParams: {
          ...actionParams,
          subActionParams: {
            ...actionParams.subActionParams,
            incident: {
              ...actionParams.subActionParams.incident,
              labels: null,
            },
          },
        },
      };
      const wrapper = mount(<JiraParamsFields {...newProps} />);
      const labels = wrapper.find('[data-test-subj="labelsComboBox"]');

      (
        labels.at(0).props() as unknown as {
          onBlur: () => void;
        }
      ).onBlur();
      expect(editAction.mock.calls[1][1].incident.labels).toEqual([]);
    });
    test('New label creation triggers editAction', () => {
      const wrapper = mount(<JiraParamsFields {...defaultProps} />);
      const labels = wrapper.find('[data-test-subj="labelsComboBox"]');
      const searchValue = 'neato';
      (
        labels.at(0).props() as unknown as {
          onCreateOption: (searchValue: string) => void;
        }
      ).onCreateOption(searchValue);
      expect(editAction.mock.calls[1][1].incident.labels).toEqual(['kibana', searchValue]);
    });
    test('A comment triggers editAction', () => {
      const wrapper = mount(<JiraParamsFields {...defaultProps} />);
      const comments = wrapper.find('[data-test-subj="commentsTextArea"] textarea');
      expect(editAction.mock.calls[0][1].comments.length).toEqual(0);
      expect(comments.simulate('change', changeEvent));
      expect(editAction.mock.calls[1][1].comments.length).toEqual(1);
    });

    test('Clears any left behind priority when issueType changes and hasPriority becomes false', () => {
      useGetFieldsByIssueTypeMock
        .mockReturnValueOnce(useGetFieldsByIssueTypeResponse)
        .mockReturnValue(useGetFieldsByIssueTypeResponseNoPriority);
      const wrapper = mount(<JiraParamsFields {...defaultProps} />);
      wrapper.setProps({
        ...{
          ...defaultProps,
          actionParams: {
            ...defaultProps.actionParams,
            incident: { issueType: '10001' },
          },
        },
      });
      expect(editAction.mock.calls[0][1].incident.priority).toEqual('Medium');
      expect(editAction.mock.calls[1][1].incident.priority).toEqual(null);
    });

    test('Preserve priority when the issue type fields are loading and hasPriority becomes stale', () => {
      useGetFieldsByIssueTypeMock
        .mockReturnValueOnce(useGetFieldsByIssueTypeResponseLoading)
        .mockReturnValue(useGetFieldsByIssueTypeResponse);
      const wrapper = mount(<JiraParamsFields {...defaultProps} />);

      expect(editAction).not.toBeCalled();

      wrapper.setProps({ ...defaultProps }); // just to force component call useGetFieldsByIssueType again

      expect(editAction).toBeCalledTimes(1);
      expect(editAction.mock.calls[0][1].incident.priority).toEqual('Medium');
    });
  });
});
