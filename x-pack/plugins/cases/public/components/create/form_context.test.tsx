/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { act, waitFor } from '@testing-library/react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';

import { ConnectorTypes } from '../../../common';
import { TestProviders } from '../../common/mock';
import { usePostCase } from '../../containers/use_post_case';
import { usePostComment } from '../../containers/use_post_comment';
import { useGetTags } from '../../containers/use_get_tags';
import { useConnectors } from '../../containers/configure/use_connectors';
import { useCaseConfigure } from '../../containers/configure/use_configure';
import { connectorsMock } from '../../containers/configure/mock';
import { useGetIncidentTypes } from '../connectors/resilient/use_get_incident_types';
import { useGetSeverity } from '../connectors/resilient/use_get_severity';
import { useGetIssueTypes } from '../connectors/jira/use_get_issue_types';
import { useGetChoices } from '../connectors/servicenow/use_get_choices';
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
  useGetChoicesResponse,
} from './mock';
import { FormContext } from './form_context';
import { CreateCaseForm } from './form';
import { SubmitCaseButton } from './submit_button';
import { usePostPushToService } from '../../containers/use_post_push_to_service';

const sampleId = 'case-id';

jest.mock('../../containers/use_post_case');
jest.mock('../../containers/use_post_comment');
jest.mock('../../containers/use_post_push_to_service');
jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/configure/use_connectors');
jest.mock('../../containers/configure/use_configure');
jest.mock('../connectors/resilient/use_get_incident_types');
jest.mock('../connectors/resilient/use_get_severity');
jest.mock('../connectors/jira/use_get_issue_types');
jest.mock('../connectors/jira/use_get_fields_by_issue_type');
jest.mock('../connectors/jira/use_get_single_issue');
jest.mock('../connectors/jira/use_get_issues');
jest.mock('../connectors/servicenow/use_get_choices');

const useConnectorsMock = useConnectors as jest.Mock;
const useCaseConfigureMock = useCaseConfigure as jest.Mock;
const usePostCaseMock = usePostCase as jest.Mock;
const usePostCommentMock = usePostComment as jest.Mock;
const usePostPushToServiceMock = usePostPushToService as jest.Mock;
const useGetIncidentTypesMock = useGetIncidentTypes as jest.Mock;
const useGetSeverityMock = useGetSeverity as jest.Mock;
const useGetIssueTypesMock = useGetIssueTypes as jest.Mock;
const useGetFieldsByIssueTypeMock = useGetFieldsByIssueType as jest.Mock;
const useGetChoicesMock = useGetChoices as jest.Mock;
const postCase = jest.fn();
const pushCaseToExternalService = jest.fn();

const defaultPostCase = {
  isLoading: false,
  isError: false,
  postCase,
};

const defaultCreateCaseForm = {
  isLoadingConnectors: false,
  connectors: [],
};

const defaultPostPushToService = {
  isLoading: false,
  isError: false,
  pushCaseToExternalService,
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
  const afterCaseCreated = jest.fn();
  const postComment = jest.fn();

  beforeAll(() => {
    postCase.mockResolvedValue({
      id: sampleId,
      ...sampleData,
    });
    usePostCaseMock.mockImplementation(() => defaultPostCase);
    usePostCommentMock.mockImplementation(() => ({ postComment }));
    usePostPushToServiceMock.mockImplementation(() => defaultPostPushToService);
    useConnectorsMock.mockReturnValue(sampleConnectorData);
    useCaseConfigureMock.mockImplementation(() => useCaseConfigureResponse);
    useGetIncidentTypesMock.mockReturnValue(useGetIncidentTypesResponse);
    useGetSeverityMock.mockReturnValue(useGetSeverityResponse);
    useGetIssueTypesMock.mockReturnValue(useGetIssueTypesResponse);
    useGetFieldsByIssueTypeMock.mockReturnValue(useGetFieldsByIssueTypeResponse);
    useGetChoicesMock.mockReturnValue(useGetChoicesResponse);

    (useGetTags as jest.Mock).mockImplementation(() => ({
      tags: sampleTags,
      fetchTags,
    }));
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Step 1 - Case Fields', () => {
    it('it renders', async () => {
      const wrapper = mount(
        <TestProviders>
          <FormContext onSuccess={onFormSubmitSuccess}>
            <CreateCaseForm {...defaultCreateCaseForm} />
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
            <CreateCaseForm {...defaultCreateCaseForm} />
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
            <CreateCaseForm {...defaultCreateCaseForm} />
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

    it('it should select the default connector set in the configuration', async () => {
      useCaseConfigureMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        connector: {
          id: 'servicenow-1',
          name: 'SN',
          type: ConnectorTypes.serviceNowITSM,
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
            <CreateCaseForm {...defaultCreateCaseForm} />
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
              category: null,
              subcategory: null,
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
          type: ConnectorTypes.serviceNowITSM,
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
            <CreateCaseForm {...defaultCreateCaseForm} />
            <SubmitCaseButton />
          </FormContext>
        </TestProviders>
      );

      fillForm(wrapper);
      wrapper.find(`[data-test-subj="create-case-submit"]`).first().simulate('click');
      await waitFor(() => {
        expect(postCase).toBeCalledWith(sampleData);
        expect(pushCaseToExternalService).not.toHaveBeenCalled();
      });
    });
  });

  describe('Step 2 - Connector Fields', () => {
    it(`it should submit and push to Jira connector`, async () => {
      useConnectorsMock.mockReturnValue({
        ...sampleConnectorData,
        connectors: connectorsMock,
      });

      const wrapper = mount(
        <TestProviders>
          <FormContext onSuccess={onFormSubmitSuccess}>
            <CreateCaseForm {...defaultCreateCaseForm} />
            <SubmitCaseButton />
          </FormContext>
        </TestProviders>
      );

      fillForm(wrapper);
      expect(wrapper.find(`[data-test-subj="connector-fields-jira"]`).exists()).toBeFalsy();
      wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
      wrapper.find(`button[data-test-subj="dropdown-connector-jira-1"]`).simulate('click');

      await waitFor(() => {
        wrapper.update();
        expect(wrapper.find(`[data-test-subj="connector-fields-jira"]`).exists()).toBeTruthy();
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

      await waitFor(() => {
        expect(postCase).toBeCalledWith({
          ...sampleData,
          connector: {
            id: 'jira-1',
            name: 'Jira',
            type: '.jira',
            fields: { issueType: '10007', parent: null, priority: '2' },
          },
        });
        expect(pushCaseToExternalService).toHaveBeenCalledWith({
          caseId: sampleId,
          connector: {
            id: 'jira-1',
            name: 'Jira',
            type: '.jira',
            fields: { issueType: '10007', parent: null, priority: '2' },
          },
        });
        expect(onFormSubmitSuccess).toHaveBeenCalledWith({
          id: sampleId,
          ...sampleData,
        });
      });
    });

    it(`it should submit and push to resilient connector`, async () => {
      useConnectorsMock.mockReturnValue({
        ...sampleConnectorData,
        connectors: connectorsMock,
      });

      const wrapper = mount(
        <TestProviders>
          <FormContext onSuccess={onFormSubmitSuccess}>
            <CreateCaseForm {...defaultCreateCaseForm} />
            <SubmitCaseButton />
          </FormContext>
        </TestProviders>
      );

      fillForm(wrapper);
      expect(wrapper.find(`[data-test-subj="connector-fields-resilient"]`).exists()).toBeFalsy();
      wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
      wrapper.find(`button[data-test-subj="dropdown-connector-resilient-2"]`).simulate('click');

      await waitFor(() => {
        wrapper.update();
        expect(wrapper.find(`[data-test-subj="connector-fields-resilient"]`).exists()).toBeTruthy();
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

      await waitFor(() => {
        expect(postCase).toBeCalledWith({
          ...sampleData,
          connector: {
            id: 'resilient-2',
            name: 'My Connector 2',
            type: '.resilient',
            fields: { incidentTypes: ['19'], severityCode: '4' },
          },
        });

        expect(pushCaseToExternalService).toHaveBeenCalledWith({
          caseId: sampleId,
          connector: {
            id: 'resilient-2',
            name: 'My Connector 2',
            type: '.resilient',
            fields: { incidentTypes: ['19'], severityCode: '4' },
          },
        });

        expect(onFormSubmitSuccess).toHaveBeenCalledWith({
          id: sampleId,
          ...sampleData,
        });
      });
    });

    it(`it should submit and push to servicenow itsm connector`, async () => {
      useConnectorsMock.mockReturnValue({
        ...sampleConnectorData,
        connectors: connectorsMock,
      });

      const wrapper = mount(
        <TestProviders>
          <FormContext onSuccess={onFormSubmitSuccess}>
            <CreateCaseForm {...defaultCreateCaseForm} />
            <SubmitCaseButton />
          </FormContext>
        </TestProviders>
      );

      fillForm(wrapper);
      expect(wrapper.find(`[data-test-subj="connector-fields-sn-itsm"]`).exists()).toBeFalsy();
      wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
      wrapper.find(`button[data-test-subj="dropdown-connector-servicenow-1"]`).simulate('click');

      await waitFor(() => {
        wrapper.update();
        expect(wrapper.find(`[data-test-subj="connector-fields-sn-itsm"]`).exists()).toBeTruthy();
      });

      ['severitySelect', 'urgencySelect', 'impactSelect'].forEach((subj) => {
        wrapper
          .find(`select[data-test-subj="${subj}"]`)
          .first()
          .simulate('change', {
            target: { value: '2' },
          });
      });

      wrapper
        .find('select[data-test-subj="categorySelect"]')
        .first()
        .simulate('change', {
          target: { value: 'software' },
        });

      wrapper
        .find('select[data-test-subj="subcategorySelect"]')
        .first()
        .simulate('change', {
          target: { value: 'os' },
        });

      wrapper.find(`[data-test-subj="create-case-submit"]`).first().simulate('click');

      await waitFor(() => {
        expect(postCase).toBeCalledWith({
          ...sampleData,
          connector: {
            id: 'servicenow-1',
            name: 'My Connector',
            type: '.servicenow',
            fields: {
              impact: '2',
              severity: '2',
              urgency: '2',
              category: 'software',
              subcategory: 'os',
            },
          },
        });

        expect(pushCaseToExternalService).toHaveBeenCalledWith({
          caseId: sampleId,
          connector: {
            id: 'servicenow-1',
            name: 'My Connector',
            type: '.servicenow',
            fields: {
              impact: '2',
              severity: '2',
              urgency: '2',
              category: 'software',
              subcategory: 'os',
            },
          },
        });

        expect(onFormSubmitSuccess).toHaveBeenCalledWith({
          id: sampleId,
          ...sampleData,
        });
      });
    });

    it(`it should submit and push to servicenow sir connector`, async () => {
      useConnectorsMock.mockReturnValue({
        ...sampleConnectorData,
        connectors: connectorsMock,
      });

      const wrapper = mount(
        <TestProviders>
          <FormContext onSuccess={onFormSubmitSuccess}>
            <CreateCaseForm {...defaultCreateCaseForm} />
            <SubmitCaseButton />
          </FormContext>
        </TestProviders>
      );

      fillForm(wrapper);
      expect(wrapper.find(`[data-test-subj="connector-fields-sn-sir"]`).exists()).toBeFalsy();
      wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
      wrapper.find(`button[data-test-subj="dropdown-connector-servicenow-sir"]`).simulate('click');

      await waitFor(() => {
        wrapper.update();
        expect(wrapper.find(`[data-test-subj="connector-fields-sn-sir"]`).exists()).toBeTruthy();
      });

      wrapper
        .find('[data-test-subj="destIpCheckbox"] input')
        .first()
        .simulate('change', { target: { checked: false } });

      wrapper
        .find('select[data-test-subj="prioritySelect"]')
        .first()
        .simulate('change', {
          target: { value: '1' },
        });

      wrapper
        .find('select[data-test-subj="categorySelect"]')
        .first()
        .simulate('change', {
          target: { value: 'Denial of Service' },
        });

      wrapper
        .find('select[data-test-subj="subcategorySelect"]')
        .first()
        .simulate('change', {
          target: { value: '26' },
        });

      wrapper.find(`[data-test-subj="create-case-submit"]`).first().simulate('click');

      await waitFor(() => {
        expect(postCase).toBeCalledWith({
          ...sampleData,
          connector: {
            id: 'servicenow-sir',
            name: 'My Connector SIR',
            type: '.servicenow-sir',
            fields: {
              destIp: false,
              sourceIp: true,
              malwareHash: true,
              malwareUrl: true,
              priority: '1',
              category: 'Denial of Service',
              subcategory: '26',
            },
          },
        });

        expect(pushCaseToExternalService).toHaveBeenCalledWith({
          caseId: sampleId,
          connector: {
            id: 'servicenow-sir',
            name: 'My Connector SIR',
            type: '.servicenow-sir',
            fields: {
              destIp: false,
              sourceIp: true,
              malwareHash: true,
              malwareUrl: true,
              priority: '1',
              category: 'Denial of Service',
              subcategory: '26',
            },
          },
        });

        expect(onFormSubmitSuccess).toHaveBeenCalledWith({
          id: sampleId,
          ...sampleData,
        });
      });
    });
  });

  it(`it should call afterCaseCreated`, async () => {
    useConnectorsMock.mockReturnValue({
      ...sampleConnectorData,
      connectors: connectorsMock,
    });

    const wrapper = mount(
      <TestProviders>
        <FormContext onSuccess={onFormSubmitSuccess} afterCaseCreated={afterCaseCreated}>
          <CreateCaseForm {...defaultCreateCaseForm} />
          <SubmitCaseButton />
        </FormContext>
      </TestProviders>
    );

    fillForm(wrapper);
    expect(wrapper.find(`[data-test-subj="connector-fields-jira"]`).exists()).toBeFalsy();
    wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
    wrapper.find(`button[data-test-subj="dropdown-connector-jira-1"]`).simulate('click');

    await waitFor(() => {
      wrapper.update();
      expect(wrapper.find(`[data-test-subj="connector-fields-jira"]`).exists()).toBeTruthy();
    });

    wrapper.find(`[data-test-subj="create-case-submit"]`).first().simulate('click');
    await waitFor(() => {
      expect(afterCaseCreated).toHaveBeenCalledWith(
        {
          id: sampleId,
          ...sampleData,
        },
        postComment
      );
    });
  });

  it(`it should call callbacks in correct order`, async () => {
    useConnectorsMock.mockReturnValue({
      ...sampleConnectorData,
      connectors: connectorsMock,
    });

    const wrapper = mount(
      <TestProviders>
        <FormContext onSuccess={onFormSubmitSuccess} afterCaseCreated={afterCaseCreated}>
          <CreateCaseForm {...defaultCreateCaseForm} />
          <SubmitCaseButton />
        </FormContext>
      </TestProviders>
    );

    fillForm(wrapper);
    expect(wrapper.find(`[data-test-subj="connector-fields-jira"]`).exists()).toBeFalsy();
    wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
    wrapper.find(`button[data-test-subj="dropdown-connector-jira-1"]`).simulate('click');

    await waitFor(() => {
      wrapper.update();
      expect(wrapper.find(`[data-test-subj="connector-fields-jira"]`).exists()).toBeTruthy();
    });

    wrapper.find(`[data-test-subj="create-case-submit"]`).first().simulate('click');
    await waitFor(() => {
      expect(postCase).toHaveBeenCalled();
      expect(afterCaseCreated).toHaveBeenCalled();
      expect(pushCaseToExternalService).toHaveBeenCalled();
      expect(onFormSubmitSuccess).toHaveBeenCalled();
    });

    const postCaseOrder = postCase.mock.invocationCallOrder[0];
    const afterCaseOrder = afterCaseCreated.mock.invocationCallOrder[0];
    const pushCaseToExternalServiceOrder = pushCaseToExternalService.mock.invocationCallOrder[0];
    const onFormSubmitSuccessOrder = onFormSubmitSuccess.mock.invocationCallOrder[0];

    expect(
      postCaseOrder < afterCaseOrder &&
        postCaseOrder < pushCaseToExternalServiceOrder &&
        postCaseOrder < onFormSubmitSuccessOrder
    ).toBe(true);

    expect(
      afterCaseOrder < pushCaseToExternalServiceOrder && afterCaseOrder < onFormSubmitSuccessOrder
    ).toBe(true);

    expect(pushCaseToExternalServiceOrder < onFormSubmitSuccessOrder).toBe(true);
  });
});
