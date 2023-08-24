/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { connector } from '../mock';
import { useGetIssueTypes } from './use_get_issue_types';
import FieldsPreview from './case_fields_preview';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { createQueryWithMarkup } from '../../../common/test_utils';

jest.mock('./use_get_issue_types');

const useGetIssueTypesMock = useGetIssueTypes as jest.Mock;

describe('Jira Fields: Preview', () => {
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

  const fields = {
    issueType: '10006',
    priority: 'High',
    parent: 'Parent Task',
  };

  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    appMockRenderer = createAppMockRenderer();
    useGetIssueTypesMock.mockReturnValue(useGetIssueTypesResponse);
    jest.clearAllMocks();
  });

  it('renders all fields correctly', () => {
    appMockRenderer.render(<FieldsPreview connector={connector} fields={fields} />);

    const getByText = createQueryWithMarkup(screen.getByText);

    expect(getByText('Issue type: Task')).toBeInTheDocument();
    expect(getByText('Parent issue: Parent Task')).toBeInTheDocument();
    expect(getByText('Priority: High')).toBeInTheDocument();
  });
});
