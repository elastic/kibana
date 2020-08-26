/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import JiraParamsFields from './jira_params';
import { DocLinksStart } from 'kibana/public';

import { useGetIssueTypes } from './use_get_issue_types';
import { useGetFieldsByIssueType } from './use_get_fields_by_issue_type';

jest.mock('../../../app_context', () => {
  const post = jest.fn();
  return {
    useAppDependencies: jest.fn(() => ({ http: { post } })),
  };
});

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
  },
};
const connector = {
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
    // jest.resetAllMocks();
    useGetIssueTypesMock.mockReturnValue(useGetIssueTypesResponse);
    useGetFieldsByIssueTypeMock.mockReturnValue(useGetFieldsByIssueTypeResponse);
  });

  test('all params fields is rendered', () => {
    const wrapper = mountWithIntl(
      <JiraParamsFields
        actionParams={actionParams}
        errors={{ title: [] }}
        editAction={() => {}}
        index={0}
        messageVariables={[]}
        docLinks={{ ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' } as DocLinksStart}
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
  });

  test('hide issue types and fields when loading issue types', () => {
    useGetIssueTypesMock.mockReturnValue({ ...useGetIssueTypesResponse, isLoading: true });
    const wrapper = mountWithIntl(
      <JiraParamsFields
        actionParams={actionParams}
        errors={{ title: [] }}
        editAction={() => {}}
        index={0}
        messageVariables={[]}
        docLinks={{ ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' } as DocLinksStart}
        actionConnector={connector}
      />
    );
    expect(wrapper.find('[data-test-subj="issueTypeSelect"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="prioritySelect"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="titleInput"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="descriptionTextArea"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="labelsComboBox"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="commentsTextArea"]').exists()).toBeFalsy();
  });

  test('hide fields when loading fields', () => {
    useGetIssueTypesMock.mockReturnValue(useGetIssueTypesResponse);
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
        docLinks={{ ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' } as DocLinksStart}
        actionConnector={connector}
      />
    );
    expect(wrapper.find('[data-test-subj="issueTypeSelect"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="prioritySelect"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="titleInput"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="descriptionTextArea"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="labelsComboBox"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="commentsTextArea"]').exists()).toBeFalsy();
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
        docLinks={{ ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' } as DocLinksStart}
        actionConnector={connector}
      />
    );

    expect(wrapper.find('[data-test-subj="issueTypeSelect"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="titleInput"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="commentsTextArea"]').exists()).toBeTruthy();

    expect(wrapper.find('[data-test-subj="prioritySelect"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="descriptionTextArea"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="labelsComboBox"]').exists()).toBeFalsy();
  });
});
