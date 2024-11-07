/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';

import { TestProviders } from '../../common/mock';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import { useGetIncidentTypes } from '../connectors/resilient/use_get_incident_types';
import { useGetSeverity } from '../connectors/resilient/use_get_severity';
import { useGetIssueTypes } from '../connectors/jira/use_get_issue_types';
import { useGetFieldsByIssueType } from '../connectors/jira/use_get_fields_by_issue_type';
import { useCaseConfigureResponse } from '../configure_cases/__mock__';
import {
  sampleConnectorData,
  sampleData,
  sampleTags,
  useGetIncidentTypesResponse,
  useGetSeverityResponse,
  useGetIssueTypesResponse,
  useGetFieldsByIssueTypeResponse,
} from './mock';
import { CreateCase } from '.';
import { useGetSupportedActionConnectors } from '../../containers/configure/use_get_supported_action_connectors';
import { useGetTags } from '../../containers/use_get_tags';

jest.mock('../../common/lib/kibana');
jest.mock('../../containers/api');
jest.mock('../../containers/user_profiles/api');
jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/configure/use_get_supported_action_connectors');
jest.mock('../../containers/configure/use_get_case_configuration');
jest.mock('../connectors/resilient/use_get_incident_types');
jest.mock('../connectors/resilient/use_get_severity');
jest.mock('../connectors/jira/use_get_issue_types');
jest.mock('../connectors/jira/use_get_fields_by_issue_type');
jest.mock('../connectors/jira/use_get_issues');

const useGetConnectorsMock = useGetSupportedActionConnectors as jest.Mock;
const useGetCaseConfigurationMock = useGetCaseConfiguration as jest.Mock;
const useGetTagsMock = useGetTags as jest.Mock;
const useGetIncidentTypesMock = useGetIncidentTypes as jest.Mock;
const useGetSeverityMock = useGetSeverity as jest.Mock;
const useGetIssueTypesMock = useGetIssueTypes as jest.Mock;
const useGetFieldsByIssueTypeMock = useGetFieldsByIssueType as jest.Mock;
const fetchTags = jest.fn();

const defaultProps = {
  onCancel: jest.fn(),
  onSuccess: jest.fn(),
};

describe('CreateCase case', () => {
  let user: UserEvent;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    useGetConnectorsMock.mockReturnValue(sampleConnectorData);
    useGetCaseConfigurationMock.mockImplementation(() => useCaseConfigureResponse);
    useGetIncidentTypesMock.mockReturnValue(useGetIncidentTypesResponse);
    useGetSeverityMock.mockReturnValue(useGetSeverityResponse);
    useGetIssueTypesMock.mockReturnValue(useGetIssueTypesResponse);
    useGetFieldsByIssueTypeMock.mockReturnValue(useGetFieldsByIssueTypeResponse);
    useGetTagsMock.mockImplementation(() => ({
      data: sampleTags,
      refetch: fetchTags,
    }));
  });

  it('it renders', async () => {
    render(
      <TestProviders>
        <CreateCase {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('create-case-submit')).toBeInTheDocument();
      expect(screen.getByTestId('create-case-cancel')).toBeInTheDocument();
    });
  });

  it('should open modal on cancel click', async () => {
    render(
      <TestProviders>
        <CreateCase {...defaultProps} />
      </TestProviders>
    );

    await user.click(screen.getByTestId('create-case-cancel'));

    await waitFor(() => {
      expect(screen.getByTestId('cancel-creation-confirmation-modal')).toBeInTheDocument();
    });
  });

  it('should confirm cancelation on modal confirm click', async () => {
    render(
      <TestProviders>
        <CreateCase {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('create-case-cancel')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('create-case-cancel'));

    await waitFor(() => {
      expect(screen.getByTestId('cancel-creation-confirmation-modal')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('confirmModalConfirmButton'));

    await waitFor(() => {
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  it('should close modal on modal cancel click', async () => {
    render(
      <TestProviders>
        <CreateCase {...defaultProps} />
      </TestProviders>
    );

    await user.click(screen.getByTestId('create-case-cancel'));

    await waitFor(() => {
      expect(screen.queryByTestId('cancel-creation-confirmation-modal')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('confirmModalCancelButton'));

    await waitFor(() => {
      expect(screen.queryByTestId('cancel-creation-confirmation-modal')).not.toBeInTheDocument();
    });
  });

  it('should redirect to new case when posting the case', async () => {
    render(
      <TestProviders>
        <CreateCase {...defaultProps} />
      </TestProviders>
    );

    const titleInput = within(screen.getByTestId('caseTitle')).getByTestId('input');
    await user.click(titleInput);
    await user.paste(sampleData.title);

    const descriptionInput = within(screen.getByTestId('caseDescription')).getByTestId(
      'euiMarkdownEditorTextArea'
    );
    await user.click(descriptionInput);
    await user.paste(sampleData.description);

    await user.click(screen.getByTestId('create-case-submit'));

    expect(defaultProps.onSuccess).toHaveBeenCalled();
  });
});
