/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { omit } from 'lodash/fp';
import { waitFor, screen, fireEvent, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useKibana } from '../../../common/lib/kibana';
import { connector, issues } from '../mock';
import { useGetIssueTypes } from './use_get_issue_types';
import { useGetFieldsByIssueType } from './use_get_fields_by_issue_type';
import Fields from './case_fields';
import { useGetIssues } from './use_get_issues';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { MockFormWrapperComponent } from '../test_utils';

jest.mock('./use_get_issue_types');
jest.mock('./use_get_fields_by_issue_type');
jest.mock('./use_get_issues');
jest.mock('../../../common/lib/kibana');

const useGetIssueTypesMock = useGetIssueTypes as jest.Mock;
const useGetFieldsByIssueTypeMock = useGetFieldsByIssueType as jest.Mock;
const useGetIssuesMock = useGetIssues as jest.Mock;
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('Jira Fields', () => {
  const useGetIssueTypesResponse = {
    isLoading: false,
    data: {
      data: [
        {
          id: '10006',
          name: 'Task',
        },
        {
          id: '10007',
          name: 'Bug',
        },
      ],
    },
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

  const useGetIssuesResponse = {
    isLoading: false,
    issues,
  };

  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    appMockRenderer = createAppMockRenderer();
    useGetIssueTypesMock.mockReturnValue(useGetIssueTypesResponse);
    useGetFieldsByIssueTypeMock.mockReturnValue(useGetFieldsByIssueTypeResponse);
    useKibanaMock().services.triggersActionsUi.actionTypeRegistry.get = jest.fn().mockReturnValue({
      actionTypeTitle: '.jira',
      iconClass: 'logoSecurity',
    });
    jest.clearAllMocks();
  });

  it('all params fields are rendered', () => {
    appMockRenderer.render(
      <MockFormWrapperComponent>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(screen.getByTestId('issueTypeSelect')).toHaveValue('10006');
    expect(screen.getByTestId('prioritySelect')).toHaveValue('High');
    expect(screen.getByTestId('search-parent-issues')).not.toBeInTheDocument();
  });

  it('sets parent correctly', async () => {
    useGetFieldsByIssueTypeMock.mockReturnValue({
      ...useGetFieldsByIssueTypeResponse,
      fields: {
        ...useGetFieldsByIssueTypeResponse.fields,
        parent: {},
      },
    });

    useGetIssuesMock.mockReturnValue(useGetIssuesResponse);

    appMockRenderer.render(
      <MockFormWrapperComponent>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    await act(async () => {
      const event = { target: { value: 'parentId' } };
      fireEvent.change(screen.getByTestId('comboBoxSearchInput'), event);
    });

    expect(screen.getByText('parentId')).toBeInTheDocument();
  });

  it('searches parent correctly', async () => {
    useGetFieldsByIssueTypeMock.mockReturnValue({
      ...useGetFieldsByIssueTypeResponse,
      fields: {
        ...useGetFieldsByIssueTypeResponse.fields,
        parent: {},
      },
    });

    useGetIssuesMock.mockReturnValue(useGetIssuesResponse);

    appMockRenderer.render(
      <MockFormWrapperComponent>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    await act(async () => {
      const event = { target: { value: 'womanId' } };
      fireEvent.change(screen.getByTestId('comboBoxSearchInput'), event);
    });

    expect(useGetIssuesMock.mock.calls[2][0].query).toEqual('womanId');
  });

  it('disabled the fields when loading issue types', () => {
    useGetIssueTypesMock.mockReturnValue({ ...useGetIssueTypesResponse, isLoading: true });

    appMockRenderer.render(
      <MockFormWrapperComponent>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(screen.getByTestId('issueTypeSelect')).toBeDisabled();
    expect(screen.getByTestId('prioritySelect')).toBeDisabled();
  });

  it('disabled the fields when loading fields', () => {
    useGetFieldsByIssueTypeMock.mockReturnValue({
      ...useGetFieldsByIssueTypeResponse,
      isLoading: true,
    });

    appMockRenderer.render(
      <MockFormWrapperComponent>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(screen.getByTestId('issueTypeSelect')).toBeDisabled();
    expect(screen.getByTestId('prioritySelect')).toBeDisabled();
  });

  it('hides the priority if not supported', () => {
    const response = omit('fields.priority', useGetFieldsByIssueTypeResponse);

    useGetFieldsByIssueTypeMock.mockReturnValue(response);

    appMockRenderer.render(
      <MockFormWrapperComponent>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(screen.queryByTestId('prioritySelect')).not.toBeInTheDocument();
  });

  it('sets issue type correctly', () => {
    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    userEvent.selectOptions(screen.getByTestId('issueTypeSelect'), '10007');
    expect(screen.getByTestId('issueTypeSelect')).toHaveValue('10007');
  });

  it('sets issue type when it comes as null', () => {
    appMockRenderer.render(
      <MockFormWrapperComponent fields={{ ...fields, issueType: null }}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(screen.getByTestId('issueTypeSelect')).toHaveValue('10006');
  });

  it('sets issue type when it comes as unknown value', () => {
    appMockRenderer.render(
      <MockFormWrapperComponent fields={{ ...fields, issueType: '99999' }}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(screen.getByTestId('issueTypeSelect')).toHaveValue('10006');
  });

  it('sets priority correctly', () => {
    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    userEvent.selectOptions(screen.getByTestId('prioritySelect'), 'Low');

    expect(screen.getByTestId('prioritySelect')).toHaveValue('Low');
  });

  it('resets priority when changing issue type', () => {
    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    userEvent.selectOptions(screen.getByTestId('issueTypeSelect'), '2');

    expect(screen.getByTestId('issueTypeSelect')).toHaveValue('10007');
    expect(screen.getByTestId('prioritySelect')).toHaveValue('');
  });

  it('should submit Jira connector', async () => {
    const { rerender } = appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Bug' }));
      expect(screen.getByRole('option', { name: 'Low' }));
    });

    const checkbox = within(screen.getByTestId('issueTypeSelect')).getByTestId(
      'comboBoxSearchInput'
    );

    userEvent.type(checkbox, 'Bug{enter}');

    rerender(
      <MockFormWrapperComponent fields={{ ...fields, issueType: '10007' }}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    userEvent.selectOptions(screen.getByTestId('prioritySelect'), ['Low']);

    expect(screen.getByTestId('issueTypeSelect')).toHaveValue('10007');
    expect(screen.getByTestId('prioritySelect')).toHaveValue('Low');
  });
});
