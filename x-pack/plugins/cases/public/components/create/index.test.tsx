/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactWrapper } from 'enzyme';
import { mount } from 'enzyme';
import { act, waitFor } from '@testing-library/react';

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';

import { TestProviders } from '../../common/mock';
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

const fillForm = (wrapper: ReactWrapper) => {
  wrapper
    .find(`[data-test-subj="caseTitle"] input`)
    .first()
    .simulate('change', { target: { value: sampleData.title } });

  wrapper
    .find(`[data-test-subj="caseDescription"] textarea`)
    .first()
    .simulate('change', { target: { value: sampleData.description } });

  act(() => {
    (
      wrapper.find(EuiComboBox).at(0).props() as unknown as {
        onChange: (a: EuiComboBoxOptionOption[]) => void;
      }
    ).onChange(sampleTags.map((tag) => ({ label: tag })));
  });
};

const defaultProps = {
  onCancel: jest.fn(),
  onSuccess: jest.fn(),
};

describe('CreateCase case', () => {
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
  });

  it('it renders', async () => {
    const wrapper = mount(
      <TestProviders>
        <CreateCase {...defaultProps} />
      </TestProviders>
    );
    await act(async () => {
      expect(wrapper.find(`[data-test-subj="create-case-submit"]`).exists()).toBeTruthy();
      expect(wrapper.find(`[data-test-subj="create-case-cancel"]`).exists()).toBeTruthy();
    });
  });

  it('should open modal on cancel click', async () => {
    const wrapper = mount(
      <TestProviders>
        <CreateCase {...defaultProps} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="create-case-cancel"]`).first().simulate('click');

    await waitFor(() => {
      expect(
        wrapper.find(`[data-test-subj="cancel-creation-confirmation-modal"]`).exists()
      ).toBeTruthy();
    });
  });

  it('should confirm cancelation on modal confirm click', async () => {
    const wrapper = mount(
      <TestProviders>
        <CreateCase {...defaultProps} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="create-case-cancel"]`).first().simulate('click');

    await waitFor(() => {
      expect(
        wrapper.find(`[data-test-subj="cancel-creation-confirmation-modal"]`).exists()
      ).toBeTruthy();
    });

    wrapper.find(`button[data-test-subj="confirmModalConfirmButton"]`).simulate('click');

    await waitFor(() => {
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  it('should close modal on modal cancel click', async () => {
    const wrapper = mount(
      <TestProviders>
        <CreateCase {...defaultProps} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="create-case-cancel"]`).first().simulate('click');

    await waitFor(() => {
      expect(
        wrapper.find(`[data-test-subj="cancel-creation-confirmation-modal"]`).exists()
      ).toBeTruthy();
    });

    wrapper.find(`button[data-test-subj="confirmModalCancelButton"]`).simulate('click');

    await waitFor(() => {
      expect(
        wrapper.find(`[data-test-subj="cancel-creation-confirmation-modal"]`).exists()
      ).toBeFalsy();
    });
  });

  it('should redirect to new case when posting the case', async () => {
    const wrapper = mount(
      <TestProviders>
        <CreateCase {...defaultProps} />
      </TestProviders>
    );

    await act(async () => {
      fillForm(wrapper);
      wrapper.find(`button[data-test-subj="create-case-submit"]`).first().simulate('click');
    });

    expect(defaultProps.onSuccess).toHaveBeenCalled();
  });
});
