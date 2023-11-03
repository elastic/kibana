/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { omit } from 'lodash/fp';
import { waitFor, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

describe('Jira Fields', () => {
  const useGetIssueTypesResponse = {
    isLoading: false,
    isFetching: false,
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
    isFetching: false,
    data: {
      data: {
        summary: { allowedValues: [], defaultValue: {} },
        labels: { allowedValues: [], defaultValue: {} },
        description: { allowedValues: [], defaultValue: {} },
        parent: { allowedValues: [], defaultValue: {} },
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
    },
  };

  const fields = {
    issueType: '10006',
    priority: 'High',
    parent: null,
  };

  const useGetIssuesResponse = {
    isLoading: false,
    isFetching: false,
    data: { data: issues },
  };

  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    appMockRenderer = createAppMockRenderer();
    useGetIssueTypesMock.mockReturnValue(useGetIssueTypesResponse);
    useGetFieldsByIssueTypeMock.mockReturnValue(useGetFieldsByIssueTypeResponse);
    useGetIssuesMock.mockReturnValue(useGetIssuesResponse);
    jest.clearAllMocks();
  });

  it('all params fields are rendered', async () => {
    appMockRenderer.render(
      <MockFormWrapperComponent>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(await screen.findByTestId('prioritySelect')).toBeInTheDocument();
    expect(await screen.findByTestId('issueTypeSelect')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId('search-parent-issues')).toBeInTheDocument();
    });
  });

  it('renders the fields correctly when selecting an issue type', async () => {
    appMockRenderer.render(
      <MockFormWrapperComponent>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    const issueTypeSelect = await screen.findByTestId('issueTypeSelect');
    expect(issueTypeSelect).toBeInTheDocument();

    fireEvent.change(issueTypeSelect, {
      target: { value: 'Task' },
    });

    expect(await screen.findByTestId('prioritySelect')).toBeInTheDocument();
    expect(await screen.findByTestId('search-parent-issues')).toBeInTheDocument();
  });

  it('sets parent correctly', async () => {
    appMockRenderer.render(
      <MockFormWrapperComponent>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );
    const input = await screen.findByTestId('comboBoxSearchInput');

    fireEvent.change(input, { target: { value: 'parentId' } });

    expect(input).toHaveValue('parentId');
  });

  it('searches parent correctly', async () => {
    appMockRenderer.render(
      <MockFormWrapperComponent>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    const checkbox = within(await screen.findByTestId('search-parent-issues')).getByTestId(
      'comboBoxSearchInput'
    );

    fireEvent.change(checkbox, {
      target: { value: 'Person Task{enter}' },
    });

    expect(checkbox).toHaveValue('Person Task{enter}');
  });

  it('disabled the fields when loading issue types', async () => {
    useGetIssueTypesMock.mockReturnValue({ ...useGetIssueTypesResponse, isLoading: true });

    appMockRenderer.render(
      <MockFormWrapperComponent>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(await screen.findByTestId('issueTypeSelect')).toBeDisabled();
    expect(await screen.findByTestId('prioritySelect')).toBeDisabled();
  });

  it('disabled the priority when loading fields', async () => {
    useGetFieldsByIssueTypeMock.mockReturnValue({
      ...useGetFieldsByIssueTypeResponse,
      isLoading: true,
    });

    appMockRenderer.render(
      <MockFormWrapperComponent>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(await screen.findByTestId('prioritySelect')).toBeDisabled();
  });

  it('hides the priority if not supported', () => {
    const response = omit('data.data.priority', useGetFieldsByIssueTypeResponse);

    useGetFieldsByIssueTypeMock.mockReturnValue(response);

    appMockRenderer.render(
      <MockFormWrapperComponent>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(screen.queryByTestId('prioritySelect')).not.toBeVisible();
  });

  it('hides the parent issue if not supported', () => {
    const response = omit('data.data.parent', useGetFieldsByIssueTypeResponse);

    useGetFieldsByIssueTypeMock.mockReturnValue(response);

    appMockRenderer.render(
      <MockFormWrapperComponent>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(screen.queryByTestId('search-parent-issues')).not.toBeVisible();
  });

  it('sets issue type correctly', async () => {
    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    userEvent.selectOptions(await screen.findByTestId('issueTypeSelect'), '10007');
    expect(await screen.findByTestId('issueTypeSelect')).toHaveValue('10007');
  });

  it('sets priority correctly', async () => {
    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    userEvent.selectOptions(await screen.findByTestId('prioritySelect'), 'Low');

    expect(await screen.findByTestId('prioritySelect')).toHaveValue('Low');
  });

  it('should submit Jira connector', async () => {
    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    const issueTypeSelect = await screen.findByTestId('issueTypeSelect');
    expect(issueTypeSelect).toBeInTheDocument();

    userEvent.selectOptions(issueTypeSelect, 'Bug');

    expect(await screen.findByTestId('prioritySelect')).toBeInTheDocument();
    expect(await screen.findByTestId('search-parent-issues')).toBeInTheDocument();

    const checkbox = within(await screen.findByTestId('search-parent-issues')).getByTestId(
      'comboBoxSearchInput'
    );

    fireEvent.change(checkbox, {
      target: { value: 'Person Task' },
    });
    userEvent.selectOptions(await screen.findByTestId('prioritySelect'), ['Low']);

    expect(await screen.findByTestId('issueTypeSelect')).toHaveValue('10007');
    expect(await screen.findByTestId('prioritySelect')).toHaveValue('Low');
    expect(checkbox).toHaveValue('Person Task');
  });

  it('should validate the issue type correctly', async () => {
    appMockRenderer.render(
      <MockFormWrapperComponent>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(await screen.findByTestId('prioritySelect')).toBeInTheDocument();
    expect(await screen.findByTestId('issueTypeSelect')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId('search-parent-issues')).toBeInTheDocument();
    });

    userEvent.click(await screen.findByTestId('submit-form'));

    expect(await screen.findByText('Issue type is required')).toBeInTheDocument();
  });

  it('should not show the loading skeleton when loading issue types', async () => {
    useGetIssueTypesMock.mockReturnValue({ ...useGetIssueTypesResponse, isLoading: true });

    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(screen.queryByTestId('fields-by-issue-type-loading')).not.toBeInTheDocument();
  });

  it('should not show the loading skeleton when issueType is null', async () => {
    useGetIssueTypesMock.mockReturnValue({ ...useGetIssueTypesResponse, isLoading: true });

    appMockRenderer.render(
      <MockFormWrapperComponent fields={{ ...fields, issueType: null }}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(screen.queryByTestId('fields-by-issue-type-loading')).not.toBeInTheDocument();
  });

  it('should not show the loading skeleton when does not load fields', async () => {
    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(screen.queryByTestId('fields-by-issue-type-loading')).not.toBeInTheDocument();
  });

  it('should show the loading skeleton when loading fields', async () => {
    useGetFieldsByIssueTypeMock.mockReturnValue({
      ...useGetFieldsByIssueTypeResponse,
      isLoading: true,
    });

    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(await screen.findByTestId('fields-by-issue-type-loading')).toBeInTheDocument();
  });
});
