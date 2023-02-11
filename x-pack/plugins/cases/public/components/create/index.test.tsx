/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { waitFor, within } from '@testing-library/react';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { useCaseConfigure } from '../../containers/configure/use_configure';
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
import userEvent from '@testing-library/user-event';

jest.mock('../../containers/api');
jest.mock('../../containers/user_profiles/api');
jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/configure/use_get_supported_action_connectors');
jest.mock('../../containers/configure/use_configure');
jest.mock('../connectors/resilient/use_get_incident_types');
jest.mock('../connectors/resilient/use_get_severity');
jest.mock('../connectors/jira/use_get_issue_types');
jest.mock('../connectors/jira/use_get_fields_by_issue_type');
jest.mock('../connectors/jira/use_get_single_issue');
jest.mock('../connectors/jira/use_get_issues');

const useGetConnectorsMock = useGetSupportedActionConnectors as jest.Mock;
const useCaseConfigureMock = useCaseConfigure as jest.Mock;
const useGetTagsMock = useGetTags as jest.Mock;
const useGetIncidentTypesMock = useGetIncidentTypes as jest.Mock;
const useGetSeverityMock = useGetSeverity as jest.Mock;
const useGetIssueTypesMock = useGetIssueTypes as jest.Mock;
const useGetFieldsByIssueTypeMock = useGetFieldsByIssueType as jest.Mock;
const fetchTags = jest.fn();

const fillForm = async (renderer: RenderResult) => {
  const titleInput = within(await renderer.findByTestId('caseTitle')).getByTestId('input');

  userEvent.paste(titleInput, sampleData.title);

  const descriptionInput = within(await renderer.findByTestId('caseDescription')).getByTestId(
    'euiMarkdownEditorTextArea'
  );

  userEvent.paste(descriptionInput, sampleData.description);
};

const defaultProps = {
  onCancel: jest.fn(),
  onSuccess: jest.fn(),
};

const TIMES_TO_RUN = 10000;

for (let i = 0; i < TIMES_TO_RUN; i++) {
  describe('CreateCase case', () => {
    let appMockRenderer: AppMockRenderer;

    beforeEach(() => {
      jest.clearAllMocks();
      useGetConnectorsMock.mockReturnValue(sampleConnectorData);
      useCaseConfigureMock.mockImplementation(() => useCaseConfigureResponse);
      useGetIncidentTypesMock.mockReturnValue(useGetIncidentTypesResponse);
      useGetSeverityMock.mockReturnValue(useGetSeverityResponse);
      useGetIssueTypesMock.mockReturnValue(useGetIssueTypesResponse);
      useGetFieldsByIssueTypeMock.mockReturnValue(useGetFieldsByIssueTypeResponse);
      useGetTagsMock.mockImplementation(() => ({
        data: sampleTags,
        refetch: fetchTags,
      }));

      appMockRenderer = createAppMockRenderer();
    });

    it('renders', async () => {
      const result = appMockRenderer.render(<CreateCase {...defaultProps} />);

      expect(await result.findByTestId('create-case-submit')).toBeInTheDocument();
      expect(await result.findByTestId('create-case-cancel')).toBeInTheDocument();
    });

    it('should open modal on cancel click', async () => {
      const result = appMockRenderer.render(<CreateCase {...defaultProps} />);

      expect(await result.findByTestId('create-case-cancel')).toBeInTheDocument();
      userEvent.click(await result.findByTestId('create-case-cancel'));

      expect(await result.findByTestId('cancel-creation-confirmation-modal')).toBeInTheDocument();
    });

    it('should confirm cancelation on modal confirm click', async () => {
      const result = appMockRenderer.render(<CreateCase {...defaultProps} />);

      expect(await result.findByTestId('create-case-cancel')).toBeInTheDocument();
      userEvent.click(await result.findByTestId('create-case-cancel'));

      expect(await result.findByTestId('cancel-creation-confirmation-modal')).toBeInTheDocument();

      userEvent.click(await result.findByTestId('confirmModalConfirmButton'));

      await waitFor(() => {
        expect(defaultProps.onCancel).toHaveBeenCalled();
      });
    });

    it('should close modal on modal cancel click', async () => {
      const result = appMockRenderer.render(<CreateCase {...defaultProps} />);

      expect(await result.findByTestId('create-case-cancel')).toBeInTheDocument();
      userEvent.click(await result.findByTestId('create-case-cancel'));

      expect(await result.findByTestId('cancel-creation-confirmation-modal')).toBeInTheDocument();
      userEvent.click(await result.findByTestId('confirmModalCancelButton'));

      expect(result.queryByTestId('cancel-creation-confirmation-modal')).not.toBeInTheDocument();
    });

    it('should redirect to new case when posting the case', async () => {
      const result = appMockRenderer.render(<CreateCase {...defaultProps} />);

      await fillForm(result);

      userEvent.click(result.getByTestId('create-case-submit'));

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });
    });
  });
}
