/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import JiraParamsFields from './jira_params';
import { useGetIssueTypes } from './use_get_issue_types';
import { useGetFieldsByIssueType } from './use_get_fields_by_issue_type';
import { ActionConnector } from '../../../../types';
import { AlertProvidedActionVariables } from '../../../lib/action_variables';
jest.mock('../../../../common/lib/kibana');

jest.mock('./use_get_issue_types');
jest.mock('./use_get_fields_by_issue_type');

const useGetIssueTypesMock = useGetIssueTypes as jest.Mock;
const useGetFieldsByIssueTypeMock = useGetFieldsByIssueType as jest.Mock;

const actionParams = {
  subAction: 'pushToService',
  subActionParams: {
    title: 'sn title',
    description: 'some description',
    comments: [{ commentId: '1', comment: 'comment for jira' }],
    issueType: '10006',
    labels: ['kibana'],
    priority: 'High',
    savedObjectId: '123',
    externalId: null,
    parent: null,
  },
};

const connector: ActionConnector = {
  secrets: {},
  config: {},
  id: 'test',
  actionTypeId: '.test',
  name: 'Test',
  isPreconfigured: false,
};

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
        ],
        defaultValue: { name: 'Medium', id: '3' },
      },
    },
  };

  beforeEach(() => {
    useGetIssueTypesMock.mockReturnValue(useGetIssueTypesResponse);
    useGetFieldsByIssueTypeMock.mockReturnValue(useGetFieldsByIssueTypeResponse);
  });

  test('all params fields are rendered', () => {
    const wrapper = mountWithIntl(
      <JiraParamsFields
        actionParams={actionParams}
        errors={{ title: [] }}
        editAction={() => {}}
        index={0}
        messageVariables={[{ name: AlertProvidedActionVariables.alertId, description: '' }]}
        actionConnector={connector}
      />
    );
    expect(wrapper.find('[data-test-subj="issueTypeSelect"]').first().prop('value')).toStrictEqual(
      '10006'
    );
    expect(wrapper.find('[data-test-subj="prioritySelect"]').first().prop('value')).toStrictEqual(
      'High'
    );
    expect(wrapper.find('[data-test-subj="titleInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="descriptionTextArea"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="labelsComboBox"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="commentsTextArea"]').length > 0).toBeTruthy();

    // ensure savedObjectIdInput isnt rendered
    expect(wrapper.find('[data-test-subj="savedObjectIdInput"]').length === 0).toBeTruthy();
  });

  test('the savedObjectId fields is rendered if we cant find an alertId in the messageVariables', () => {
    const wrapper = mountWithIntl(
      <JiraParamsFields
        actionParams={actionParams}
        errors={{ title: [] }}
        editAction={() => {}}
        index={0}
        messageVariables={[]}
        actionConnector={connector}
      />
    );

    expect(wrapper.find('[data-test-subj="savedObjectIdInput"]').length > 0).toBeTruthy();
  });

  test('it shows loading when loading issue types', () => {
    useGetIssueTypesMock.mockReturnValue({ ...useGetIssueTypesResponse, isLoading: true });
    const wrapper = mountWithIntl(
      <JiraParamsFields
        actionParams={actionParams}
        errors={{ title: [] }}
        editAction={() => {}}
        index={0}
        messageVariables={[]}
        actionConnector={connector}
      />
    );

    expect(
      wrapper.find('[data-test-subj="issueTypeSelect"]').first().prop('isLoading')
    ).toBeTruthy();
  });

  test('it shows loading when loading fields', () => {
    useGetFieldsByIssueTypeMock.mockReturnValue({
      ...useGetFieldsByIssueTypeResponse,
      isLoading: true,
    });

    const wrapper = mountWithIntl(
      <JiraParamsFields
        actionParams={actionParams}
        errors={{ title: [] }}
        editAction={() => {}}
        index={0}
        messageVariables={[]}
        actionConnector={connector}
      />
    );

    expect(
      wrapper.find('[data-test-subj="prioritySelect"]').first().prop('isLoading')
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="labelsComboBox"]').first().prop('isLoading')
    ).toBeTruthy();
  });

  test('it disabled the fields when loading issue types', () => {
    useGetIssueTypesMock.mockReturnValue({ ...useGetIssueTypesResponse, isLoading: true });

    const wrapper = mountWithIntl(
      <JiraParamsFields
        actionParams={actionParams}
        errors={{ title: [] }}
        editAction={() => {}}
        index={0}
        messageVariables={[]}
        actionConnector={connector}
      />
    );

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

    const wrapper = mountWithIntl(
      <JiraParamsFields
        actionParams={actionParams}
        errors={{ title: [] }}
        editAction={() => {}}
        index={0}
        messageVariables={[]}
        actionConnector={connector}
      />
    );

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
    const wrapper = mountWithIntl(
      <JiraParamsFields
        actionParams={actionParams}
        errors={{ title: [] }}
        editAction={() => {}}
        index={0}
        messageVariables={[]}
        actionConnector={connector}
      />
    );

    expect(wrapper.find('[data-test-subj="issueTypeSelect"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="titleInput"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="commentsTextArea"]').exists()).toBeTruthy();

    expect(wrapper.find('[data-test-subj="prioritySelect"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="descriptionTextArea"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="labelsComboBox"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="search-parent-issues"]').exists()).toBeFalsy();
  });
});
