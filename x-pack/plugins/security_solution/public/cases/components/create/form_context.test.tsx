/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { act, waitFor } from '@testing-library/react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';

import { ConnectorTypes } from '../../../../../case/common/api';
import { TestProviders } from '../../../common/mock';
import { usePostCase } from '../../containers/use_post_case';
import { useGetTags } from '../../containers/use_get_tags';
import { useConnectors } from '../../containers/configure/use_connectors';
import { useCaseConfigure } from '../../containers/configure/use_configure';
import { connectorsMock } from '../../containers/configure/mock';
import { useGetIncidentTypes } from '../settings/resilient/use_get_incident_types';
import { useGetSeverity } from '../settings/resilient/use_get_severity';
import { useGetIssueTypes } from '../settings/jira/use_get_issue_types';
import { useGetFieldsByIssueType } from '../settings/jira/use_get_fields_by_issue_type';
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
import { FormContext } from './form_context';
import { CreateCaseForm } from './form';
import { SubmitCaseButton } from './submit_button';

jest.mock('../../containers/use_post_case');
jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/configure/use_connectors');
jest.mock('../../containers/configure/use_configure');
jest.mock('../settings/resilient/use_get_incident_types');
jest.mock('../settings/resilient/use_get_severity');
jest.mock('../settings/jira/use_get_issue_types');
jest.mock('../settings/jira/use_get_fields_by_issue_type');
jest.mock('../settings/jira/use_get_single_issue');
jest.mock('../settings/jira/use_get_issues');

const useConnectorsMock = useConnectors as jest.Mock;
const useCaseConfigureMock = useCaseConfigure as jest.Mock;
const usePostCaseMock = usePostCase as jest.Mock;
const useGetIncidentTypesMock = useGetIncidentTypes as jest.Mock;
const useGetSeverityMock = useGetSeverity as jest.Mock;
const useGetIssueTypesMock = useGetIssueTypes as jest.Mock;
const useGetFieldsByIssueTypeMock = useGetFieldsByIssueType as jest.Mock;
const postCase = jest.fn();

const defaultPostCase = {
  isLoading: false,
  isError: false,
  caseData: null,
  postCase,
};

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
    ((wrapper.find(EuiComboBox).props() as unknown) as {
      onChange: (a: EuiComboBoxOptionOption[]) => void;
    }).onChange(sampleTags.map((tag) => ({ label: tag })));
  });
};

describe('Create case', () => {
  const fetchTags = jest.fn();
  const onFormSubmitSuccess = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    usePostCaseMock.mockImplementation(() => defaultPostCase);
    useConnectorsMock.mockReturnValue(sampleConnectorData);
    useCaseConfigureMock.mockImplementation(() => useCaseConfigureResponse);
    useGetIncidentTypesMock.mockReturnValue(useGetIncidentTypesResponse);
    useGetSeverityMock.mockReturnValue(useGetSeverityResponse);
    useGetIssueTypesMock.mockReturnValue(useGetIssueTypesResponse);
    useGetFieldsByIssueTypeMock.mockReturnValue(useGetFieldsByIssueTypeResponse);

    (useGetTags as jest.Mock).mockImplementation(() => ({
      tags: sampleTags,
      fetchTags,
    }));
  });

  describe('Step 1 - Case Fields', () => {
    it('it renders', async () => {
      const wrapper = mount(
        <TestProviders>
          <FormContext onSuccess={onFormSubmitSuccess}>
            <CreateCaseForm />
            <SubmitCaseButton />
          </FormContext>
        </TestProviders>
      );

      expect(wrapper.find(`[data-test-subj="caseTitle"]`).first().exists()).toBeTruthy();
      expect(wrapper.find(`[data-test-subj="caseDescription"]`).first().exists()).toBeTruthy();
      expect(wrapper.find(`[data-test-subj="caseTags"]`).first().exists()).toBeTruthy();
      expect(wrapper.find(`[data-test-subj="caseConnectors"]`).first().exists()).toBeTruthy();
      expect(
        wrapper.find(`[data-test-subj="case-creation-form-steps"]`).first().exists()
      ).toBeTruthy();
    });

    it('should post case on submit click', async () => {
      useConnectorsMock.mockReturnValue({
        ...sampleConnectorData,
        connectors: connectorsMock,
      });

      const wrapper = mount(
        <TestProviders>
          <FormContext onSuccess={onFormSubmitSuccess}>
            <CreateCaseForm />
            <SubmitCaseButton />
          </FormContext>
        </TestProviders>
      );

      fillForm(wrapper);
      wrapper.find(`[data-test-subj="create-case-submit"]`).first().simulate('click');
      await waitFor(() => expect(postCase).toBeCalledWith(sampleData));
    });

    it('should toggle sync settings', async () => {
      useConnectorsMock.mockReturnValue({
        ...sampleConnectorData,
        connectors: connectorsMock,
      });

      const wrapper = mount(
        <TestProviders>
          <FormContext onSuccess={onFormSubmitSuccess}>
            <CreateCaseForm />
            <SubmitCaseButton />
          </FormContext>
        </TestProviders>
      );

      fillForm(wrapper);
      wrapper.find('[data-test-subj="caseSyncAlerts"] button').first().simulate('click');
      wrapper.find(`[data-test-subj="create-case-submit"]`).first().simulate('click');

      await waitFor(() =>
        expect(postCase).toBeCalledWith({ ...sampleData, settings: { syncAlerts: false } })
      );
    });

    it('should redirect to new case when caseData is there', async () => {
      const sampleId = 'case-id';
      usePostCaseMock.mockImplementation(() => ({
        ...defaultPostCase,
        caseData: { id: sampleId },
      }));

      mount(
        <TestProviders>
          <FormContext onSuccess={onFormSubmitSuccess}>
            <CreateCaseForm />
            <SubmitCaseButton />
          </FormContext>
        </TestProviders>
      );

      await waitFor(() => expect(onFormSubmitSuccess).toHaveBeenCalledWith({ id: 'case-id' }));
    });

    it('it should select the default connector set in the configuration', async () => {
      useCaseConfigureMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        connector: {
          id: 'servicenow-1',
          name: 'SN',
          type: ConnectorTypes.servicenow,
          fields: null,
        },
        persistLoading: false,
      }));

      useConnectorsMock.mockReturnValue({
        ...sampleConnectorData,
        connectors: connectorsMock,
      });

      const wrapper = mount(
        <TestProviders>
          <FormContext onSuccess={onFormSubmitSuccess}>
            <CreateCaseForm />
            <SubmitCaseButton />
          </FormContext>
        </TestProviders>
      );

      fillForm(wrapper);
      await act(async () => {
        wrapper.find(`[data-test-subj="create-case-submit"]`).first().simulate('click');
      });

      await waitFor(() =>
        expect(postCase).toBeCalledWith({
          ...sampleData,
          connector: {
            fields: {
              impact: null,
              severity: null,
              urgency: null,
            },
            id: 'servicenow-1',
            name: 'My Connector',
            type: '.servicenow',
          },
        })
      );
    });

    it('it should default to none if the default connector does not exist in connectors', async () => {
      useCaseConfigureMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        connector: {
          id: 'not-exist',
          name: 'SN',
          type: ConnectorTypes.servicenow,
          fields: null,
        },
        persistLoading: false,
      }));

      useConnectorsMock.mockReturnValue({
        ...sampleConnectorData,
        connectors: connectorsMock,
      });

      const wrapper = mount(
        <TestProviders>
          <FormContext onSuccess={onFormSubmitSuccess}>
            <CreateCaseForm />
            <SubmitCaseButton />
          </FormContext>
        </TestProviders>
      );

      fillForm(wrapper);
      wrapper.find(`[data-test-subj="create-case-submit"]`).first().simulate('click');
      await waitFor(() => expect(postCase).toBeCalledWith(sampleData));
    });
  });

  describe('Step 2 - Connector Fields', () => {
    it(`it should submit a Jira connector`, async () => {
      useConnectorsMock.mockReturnValue({
        ...sampleConnectorData,
        connectors: connectorsMock,
      });

      const wrapper = mount(
        <TestProviders>
          <FormContext onSuccess={onFormSubmitSuccess}>
            <CreateCaseForm />
            <SubmitCaseButton />
          </FormContext>
        </TestProviders>
      );

      fillForm(wrapper);
      expect(wrapper.find(`[data-test-subj="connector-settings-jira"]`).exists()).toBeFalsy();
      wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
      wrapper.find(`button[data-test-subj="dropdown-connector-jira-1"]`).simulate('click');

      await waitFor(() => {
        wrapper.update();
        expect(wrapper.find(`[data-test-subj="connector-settings-jira"]`).exists()).toBeTruthy();
      });

      wrapper
        .find('select[data-test-subj="issueTypeSelect"]')
        .first()
        .simulate('change', {
          target: { value: '10007' },
        });

      wrapper
        .find('select[data-test-subj="prioritySelect"]')
        .first()
        .simulate('change', {
          target: { value: '2' },
        });

      wrapper.find(`[data-test-subj="create-case-submit"]`).first().simulate('click');

      await waitFor(() =>
        expect(postCase).toBeCalledWith({
          ...sampleData,
          connector: {
            id: 'jira-1',
            name: 'Jira',
            type: '.jira',
            fields: { issueType: '10007', parent: null, priority: '2' },
          },
        })
      );
    });

    it(`it should submit a resilient connector`, async () => {
      useConnectorsMock.mockReturnValue({
        ...sampleConnectorData,
        connectors: connectorsMock,
      });

      const wrapper = mount(
        <TestProviders>
          <FormContext onSuccess={onFormSubmitSuccess}>
            <CreateCaseForm />
            <SubmitCaseButton />
          </FormContext>
        </TestProviders>
      );

      fillForm(wrapper);
      expect(wrapper.find(`[data-test-subj="connector-settings-resilient"]`).exists()).toBeFalsy();
      wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
      wrapper.find(`button[data-test-subj="dropdown-connector-resilient-2"]`).simulate('click');

      await waitFor(() => {
        wrapper.update();
        expect(
          wrapper.find(`[data-test-subj="connector-settings-resilient"]`).exists()
        ).toBeTruthy();
      });

      act(() => {
        ((wrapper.find(EuiComboBox).at(1).props() as unknown) as {
          onChange: (a: EuiComboBoxOptionOption[]) => void;
        }).onChange([{ value: '19', label: 'Denial of Service' }]);
      });

      wrapper
        .find('select[data-test-subj="severitySelect"]')
        .first()
        .simulate('change', {
          target: { value: '4' },
        });

      wrapper.find(`[data-test-subj="create-case-submit"]`).first().simulate('click');

      await waitFor(() =>
        expect(postCase).toBeCalledWith({
          ...sampleData,
          connector: {
            id: 'resilient-2',
            name: 'My Connector 2',
            type: '.resilient',
            fields: { incidentTypes: ['19'], severityCode: '4' },
          },
        })
      );
    });

    it(`it should submit a servicenow connector`, async () => {
      useConnectorsMock.mockReturnValue({
        ...sampleConnectorData,
        connectors: connectorsMock,
      });

      const wrapper = mount(
        <TestProviders>
          <FormContext onSuccess={onFormSubmitSuccess}>
            <CreateCaseForm />
            <SubmitCaseButton />
          </FormContext>
        </TestProviders>
      );

      fillForm(wrapper);
      expect(wrapper.find(`[data-test-subj="connector-settings-sn"]`).exists()).toBeFalsy();
      wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
      wrapper.find(`button[data-test-subj="dropdown-connector-servicenow-1"]`).simulate('click');
      expect(wrapper.find(`[data-test-subj="connector-settings-sn"]`).exists()).toBeTruthy();

      ['severitySelect', 'urgencySelect', 'impactSelect'].forEach((subj) => {
        wrapper
          .find(`select[data-test-subj="${subj}"]`)
          .first()
          .simulate('change', {
            target: { value: '2' },
          });
      });

      wrapper.find(`[data-test-subj="create-case-submit"]`).first().simulate('click');

      await waitFor(() =>
        expect(postCase).toBeCalledWith({
          ...sampleData,
          connector: {
            id: 'servicenow-1',
            name: 'My Connector',
            type: '.servicenow',
            fields: { impact: '2', severity: '2', urgency: '2' },
          },
        })
      );
    });
  });
});
