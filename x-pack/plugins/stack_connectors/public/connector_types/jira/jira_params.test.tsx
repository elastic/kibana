/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import JiraParamsFields from './jira_params';
import { useGetIssueTypes } from './use_get_issue_types';
import { useGetFieldsByIssueType } from './use_get_fields_by_issue_type';
import { useGetIssues } from './use_get_issues';
import { useGetSingleIssue } from './use_get_single_issue';
import { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import { act, fireEvent, render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');
jest.mock('./use_get_issue_types');
jest.mock('./use_get_fields_by_issue_type');
jest.mock('./use_get_issues');
jest.mock('./use_get_single_issue');

const useGetIssueTypesMock = useGetIssueTypes as jest.Mock;
const useGetFieldsByIssueTypeMock = useGetFieldsByIssueType as jest.Mock;
const useGetIssuesMock = useGetIssues as jest.Mock;
const useGetSingleIssueMock = useGetSingleIssue as jest.Mock;

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
      otherFields: null,
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
  isSystemAction: false as const,
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
          {
            name: 'High',
            id: '1',
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

  const useGetIssuesResponse = {
    isLoading: false,
    issues: [{ id: '1', key: '1', title: 'parent issue' }],
  };

  const useGetSingleIssueResponse = {
    issue: { id: '1', key: '1', title: 'parent issue' },
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useGetIssueTypesMock.mockReturnValue(useGetIssueTypesResponse);
    useGetFieldsByIssueTypeMock.mockReturnValue(useGetFieldsByIssueTypeResponse);
    useGetIssuesMock.mockReturnValue(useGetIssuesResponse);
    useGetSingleIssueMock.mockReturnValue(useGetSingleIssueResponse);
  });

  it('all params fields are rendered', async () => {
    const results = render(<JiraParamsFields {...defaultProps} />);

    expect(results.getByTestId('issueTypeSelect')).toBeInTheDocument();
    expect((results.getByRole('option', { name: 'Bug' }) as HTMLOptionElement).selected).toBe(true);

    expect(results.getByTestId('prioritySelect')).toBeInTheDocument();

    await waitFor(() => {
      expect((results.getByRole('option', { name: 'High' }) as HTMLOptionElement).selected).toBe(
        true
      );
    });

    expect(results.getByTestId('summaryInput')).toBeInTheDocument();
    expect(results.getByTestId('descriptionTextArea')).toBeInTheDocument();
    expect(results.getByTestId('labelsComboBox')).toBeInTheDocument();
    expect(results.getByTestId('commentsTextArea')).toBeInTheDocument();
    expect(results.getByTestId('otherFieldsJsonEditor')).toBeInTheDocument();
  });

  it('it shows loading when loading issue types', () => {
    useGetIssueTypesMock.mockReturnValue({ ...useGetIssueTypesResponse, isLoading: true });
    const results = render(<JiraParamsFields {...defaultProps} />);

    expect(results.getByRole('progressbar')).toBeInTheDocument();
  });

  it('it shows loading when loading fields', () => {
    useGetFieldsByIssueTypeMock.mockReturnValue({
      ...useGetFieldsByIssueTypeResponse,
      isLoading: true,
    });

    const results = render(<JiraParamsFields {...defaultProps} />);

    const prioritySelect = within(results.getByTestId('priority-wrapper'));
    const labelsComboBox = within(results.getByTestId('labels-wrapper'));

    expect(prioritySelect.getByRole('progressbar')).toBeInTheDocument();
    expect(labelsComboBox.getByRole('progressbar')).toBeInTheDocument();
  });

  it('it disabled the fields when loading issue types', async () => {
    useGetIssueTypesMock.mockReturnValue({ ...useGetIssueTypesResponse, isLoading: true });

    const results = render(<JiraParamsFields {...defaultProps} />);
    const labels = within(results.getByTestId('labelsComboBox'));

    expect(results.getByTestId('issueTypeSelect')).toBeDisabled();
    expect(results.getByTestId('prioritySelect')).toBeDisabled();
    expect(labels.getByTestId('comboBoxSearchInput')).toBeDisabled();
  });

  it('it disabled the fields when loading fields', () => {
    useGetFieldsByIssueTypeMock.mockReturnValue({
      ...useGetFieldsByIssueTypeResponse,
      isLoading: true,
    });

    const results = render(<JiraParamsFields {...defaultProps} />);
    const labels = within(results.getByTestId('labelsComboBox'));

    expect(results.getByTestId('issueTypeSelect')).toBeDisabled();
    expect(results.getByTestId('prioritySelect')).toBeDisabled();
    expect(labels.getByTestId('comboBoxSearchInput')).toBeDisabled();
  });

  it('hide unsupported fields', () => {
    useGetIssueTypesMock.mockReturnValue(useGetIssueTypesResponse);
    useGetFieldsByIssueTypeMock.mockReturnValue({
      ...useGetFieldsByIssueTypeResponse,
      fields: {},
    });
    const results = render(<JiraParamsFields {...defaultProps} />);

    expect(results.getByTestId('issueTypeSelect')).toBeInTheDocument();
    expect(results.getByTestId('summaryInput')).toBeInTheDocument();
    expect(results.getByTestId('commentsTextArea')).toBeInTheDocument();

    expect(results.queryByTestId('prioritySelect')).toBeFalsy();
    expect(results.queryByTestId('descriptionTextArea')).toBeFalsy();
    expect(results.queryByTestId('labelsComboBox')).toBeFalsy();
    expect(results.queryByTestId('search-parent-issues')).toBeFalsy();
  });

  it('If issue type is undefined, set to first item in issueTypes', () => {
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
    render(<JiraParamsFields {...newProps} />);
    expect(editAction.mock.calls[0][1].incident.issueType).toEqual(
      useGetIssueTypesResponse.issueTypes[0].id
    );
  });

  it('If issue type is not an option in issueTypes, set to first item in issueTypes', () => {
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
    render(<JiraParamsFields {...newProps} />);
    expect(editAction.mock.calls[0][1].incident.issueType).toEqual(
      useGetIssueTypesResponse.issueTypes[0].id
    );
  });

  it('When issueType and fields are null, return empty priority', () => {
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

    const results = render(<JiraParamsFields {...newProps} />);
    expect(results.queryByTestId('prioritySelect')).toBeFalsy();
  });

  it('If summary has errors, form row is invalid', () => {
    const newProps = {
      ...defaultProps,
      errors: { 'subActionParams.incident.summary': ['error'] },
    };

    const results = render(<JiraParamsFields {...newProps} />);
    const summary = within(results.getByTestId('summary-row'));

    expect(summary.getByText('error')).toBeInTheDocument();
  });

  it('When subActionParams is undefined, set to default', () => {
    useGetIssueTypesMock.mockReturnValue({ ...useGetIssueTypesResponse, issueTypes: [] });
    const { subActionParams, ...newParams } = actionParams;

    const newProps = {
      ...defaultProps,
      actionParams: newParams,
    };

    render(<JiraParamsFields {...newProps} />);
    expect(editAction.mock.calls[0][1]).toEqual({
      incident: {},
      comments: [],
    });
  });

  it('When subAction is undefined, set to default', () => {
    useGetIssueTypesMock.mockReturnValue({ ...useGetIssueTypesResponse, issueTypes: [] });
    const { subAction, ...newParams } = actionParams;

    const newProps = {
      ...defaultProps,
      actionParams: newParams,
    };

    render(<JiraParamsFields {...newProps} />);
    expect(editAction.mock.calls[0][1]).toEqual('pushToService');
  });

  it('Resets fields when connector changes', () => {
    const results = render(<JiraParamsFields {...defaultProps} />);

    results.rerender(
      <JiraParamsFields {...defaultProps} actionConnector={{ ...connector, id: '1234' }} />
    );

    expect(editAction.mock.calls.length).toEqual(1);
    expect(editAction.mock.calls[0][1]).toEqual({
      incident: {},
      comments: [],
    });
  });

  describe('UI updates', () => {
    it('updates summary', () => {
      const results = render(<JiraParamsFields {...defaultProps} />);

      fireEvent.change(results.getByTestId('summaryInput'), { target: { value: 'new title' } });
      expect(editAction.mock.calls[0][1].incident.summary).toEqual('new title');
    });

    it('updates description', () => {
      const results = render(<JiraParamsFields {...defaultProps} />);

      fireEvent.change(results.getByTestId('descriptionTextArea'), {
        target: { value: 'new desc' },
      });

      expect(editAction.mock.calls[0][1].incident.description).toEqual('new desc');
    });

    it('updates issue type', () => {
      const results = render(<JiraParamsFields {...defaultProps} />);

      expect(results.getByTestId('issueTypeSelect')).toBeInTheDocument();
      expect((results.getByRole('option', { name: 'Bug' }) as HTMLOptionElement).selected).toBe(
        true
      );

      act(() => {
        userEvent.selectOptions(
          results.getByTestId('issueTypeSelect'),
          results.getByRole('option', { name: 'Task' })
        );
      });

      expect(editAction.mock.calls[0][1].incident.issueType).toEqual('10005');
    });

    it('updates priority', async () => {
      const results = render(<JiraParamsFields {...defaultProps} />);

      expect(results.getByTestId('prioritySelect')).toBeInTheDocument();

      await waitFor(() => {
        expect((results.getByRole('option', { name: 'High' }) as HTMLOptionElement).selected).toBe(
          true
        );
      });

      act(() => {
        userEvent.selectOptions(
          results.getByTestId('prioritySelect'),
          results.getByRole('option', { name: 'Medium' })
        );
      });

      expect(editAction.mock.calls[0][1].incident.priority).toEqual('Medium');
    });

    it('updates parent', async () => {
      useGetFieldsByIssueTypeMock.mockReturnValue({
        ...useGetFieldsByIssueTypeResponse,
        fields: {
          ...useGetFieldsByIssueTypeResponse.fields,
          parent: {},
        },
      });

      const results = render(<JiraParamsFields {...defaultProps} />);

      await waitFor(() => {
        expect(results.getByTestId('search-parent-issues')).toBeInTheDocument();
      });

      const parentField = within(results.getByTestId('search-parent-issues'));

      await act(async () => {
        await userEvent.type(parentField.getByTestId('comboBoxSearchInput'), 'p{enter}', {
          delay: 1,
        });
      });

      await waitFor(async () => {
        expect(results.getByText('parent issue')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(editAction.mock.calls[0][1].incident.parent).toEqual('1');
      });
    });

    it('updates labels correctly', async () => {
      const results = render(<JiraParamsFields {...defaultProps} />);
      const labels = within(results.getByTestId('labelsComboBox'));

      await act(async () => {
        await userEvent.type(labels.getByTestId('comboBoxSearchInput'), 'l{enter}', {
          delay: 1,
        });
      });

      await waitFor(() => {
        expect(editAction.mock.calls[0][1].incident.labels).toEqual(['kibana', 'l']);
      });
    });

    it('Label undefined update triggers editAction', async () => {
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
      const results = render(<JiraParamsFields {...newProps} />);
      const labels = within(results.getByTestId('labelsComboBox'));

      fireEvent.focusOut(labels.getByTestId('comboBoxSearchInput'));

      await waitFor(() => {
        expect(editAction.mock.calls[0][1].incident.labels).toEqual([]);
      });
    });

    it('updates a comment ', () => {
      const results = render(<JiraParamsFields {...defaultProps} />);
      const comments = results.getByTestId('commentsTextArea');

      fireEvent.change(comments, {
        target: { value: 'new comment' },
      });

      expect(editAction.mock.calls[0][1].comments).toEqual([
        { comment: 'new comment', commentId: '1' },
      ]);
    });

    it('updates additional fields', () => {
      const TEST_VALUE = '{"field_id":"bar"}';
      const results = render(<JiraParamsFields {...defaultProps} />);
      const otherFields = results.getByTestId('otherFieldsJsonEditor');

      fireEvent.change(otherFields, {
        target: { value: TEST_VALUE },
      });

      expect(editAction.mock.calls[0][1].incident.otherFields).toEqual(TEST_VALUE);
    });

    it('Clears any left behind priority when issueType changes and hasPriority becomes false', async () => {
      useGetFieldsByIssueTypeMock
        .mockReturnValueOnce(useGetFieldsByIssueTypeResponse)
        .mockReturnValue(useGetFieldsByIssueTypeResponseNoPriority);

      const rerenderProps = {
        ...{
          ...defaultProps,
          actionParams: {
            ...defaultProps.actionParams,
            incident: { issueType: '10001' },
          },
        },
      };

      const results = render(<JiraParamsFields {...defaultProps} />);

      expect(results.getByTestId('prioritySelect')).toBeInTheDocument();

      await waitFor(() => {
        expect((results.getByRole('option', { name: 'High' }) as HTMLOptionElement).selected).toBe(
          true
        );
      });

      results.rerender(<JiraParamsFields {...rerenderProps} />);

      await waitFor(() => {
        expect(results.queryByTestId('priority-wrapper')).toBeFalsy();
        expect(editAction.mock.calls[0][1].incident.priority).toEqual(null);
      });
    });

    it('Preserve priority when the issue type fields are loading and hasPriority becomes stale', async () => {
      useGetFieldsByIssueTypeMock
        .mockReturnValueOnce(useGetFieldsByIssueTypeResponseLoading)
        .mockReturnValue(useGetFieldsByIssueTypeResponse);

      const results = render(<JiraParamsFields {...defaultProps} />);

      expect(editAction).not.toBeCalled();

      results.rerender(<JiraParamsFields {...defaultProps} />);

      await waitFor(() => {
        expect((results.getByRole('option', { name: 'High' }) as HTMLOptionElement).selected).toBe(
          true
        );
      });
    });

    it('renders additional info for the additional fields field', () => {
      const results = render(<JiraParamsFields {...defaultProps} />);
      const additionalFields = results.getByText('Additional fields help');

      expect(additionalFields).toBeInTheDocument();
    });
  });
});
