/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { act, RenderResult, waitFor, within } from '@testing-library/react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';

import { CaseSeverity, CommentType, ConnectorTypes } from '../../../common/api';
import { useKibana } from '../../common/lib/kibana';
import { AppMockRenderer, createAppMockRenderer, TestProviders } from '../../common/mock';
import { usePostCase } from '../../containers/use_post_case';
import { useCreateAttachments } from '../../containers/use_create_attachments';
import { useGetTags } from '../../containers/use_get_tags';
import { useConnectors } from '../../containers/configure/use_connectors';
import { useCaseConfigure } from '../../containers/configure/use_configure';
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
import { CreateCaseFormFields, CreateCaseFormFieldsProps } from './form';
import { SubmitCaseButton } from './submit_button';
import { usePostPushToService } from '../../containers/use_post_push_to_service';
import { Choice } from '../connectors/servicenow/types';
import userEvent from '@testing-library/user-event';
import { connectorsMock } from '../../common/mock/connectors';
import { CaseAttachments } from '../../types';

const sampleId = 'case-id';

jest.mock('../../containers/use_post_case');
jest.mock('../../containers/use_create_attachments');
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
jest.mock('../../common/lib/kibana');

const useConnectorsMock = useConnectors as jest.Mock;
const useCaseConfigureMock = useCaseConfigure as jest.Mock;
const usePostCaseMock = usePostCase as jest.Mock;
const useCreateAttachmentsMock = useCreateAttachments as jest.Mock;
const usePostPushToServiceMock = usePostPushToService as jest.Mock;
const useGetIncidentTypesMock = useGetIncidentTypes as jest.Mock;
const useGetSeverityMock = useGetSeverity as jest.Mock;
const useGetIssueTypesMock = useGetIssueTypes as jest.Mock;
const useGetFieldsByIssueTypeMock = useGetFieldsByIssueType as jest.Mock;
const useGetChoicesMock = useGetChoices as jest.Mock;
const postCase = jest.fn();
const pushCaseToExternalService = jest.fn();
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

const defaultPostCase = {
  isLoading: false,
  isError: false,
  postCase,
};

const defaultCreateCaseForm: CreateCaseFormFieldsProps = {
  isLoadingConnectors: false,
  connectors: [],
  withSteps: true,
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
    (
      wrapper.find(EuiComboBox).props() as unknown as {
        onChange: (a: EuiComboBoxOptionOption[]) => void;
      }
    ).onChange(sampleTags.map((tag) => ({ label: tag })));
  });
};

const fillFormReactTestingLib = async (renderResult: RenderResult) => {
  const titleInput = within(renderResult.getByTestId('caseTitle')).getByTestId('input');
  userEvent.type(titleInput, sampleData.title);

  const descriptionInput = renderResult.container.querySelector(
    `[data-test-subj="caseDescription"] textarea`
  );
  if (descriptionInput) {
    userEvent.type(descriptionInput, sampleData.description);
  }
  const caseTags = renderResult.getByTestId('caseTags');
  for (let i = 0; i < sampleTags.length; i++) {
    const tagsInput = await within(caseTags).findByTestId('comboBoxInput');
    userEvent.type(tagsInput, `${sampleTags[i]}{enter}`);
  }
};

describe('Create case', () => {
  const fetchTags = jest.fn();
  const onFormSubmitSuccess = jest.fn();
  const afterCaseCreated = jest.fn();
  const createAttachments = jest.fn();
  let onChoicesSuccess: (values: Choice[]) => void;
  let mockedContext: AppMockRenderer;

  beforeAll(() => {
    postCase.mockResolvedValue({
      id: sampleId,
      ...sampleData,
    });
    usePostCaseMock.mockImplementation(() => defaultPostCase);
    useCreateAttachmentsMock.mockImplementation(() => ({ createAttachments }));
    usePostPushToServiceMock.mockImplementation(() => defaultPostPushToService);
    useConnectorsMock.mockReturnValue(sampleConnectorData);
    useCaseConfigureMock.mockImplementation(() => useCaseConfigureResponse);
    useGetIncidentTypesMock.mockReturnValue(useGetIncidentTypesResponse);
    useGetSeverityMock.mockReturnValue(useGetSeverityResponse);
    useGetIssueTypesMock.mockReturnValue(useGetIssueTypesResponse);
    useGetFieldsByIssueTypeMock.mockReturnValue(useGetFieldsByIssueTypeResponse);
    useGetChoicesMock.mockImplementation(
      ({ onSuccess }: { onSuccess: (values: Choice[]) => void }) => {
        onChoicesSuccess = onSuccess;
        return useGetChoicesResponse;
      }
    );

    (useGetTags as jest.Mock).mockImplementation(() => ({
      tags: sampleTags,
      fetchTags,
    }));
    useKibanaMock().services.triggersActionsUi.actionTypeRegistry.get = jest.fn().mockReturnValue({
      actionTypeTitle: '.servicenow',
      iconClass: 'logoSecurity',
    });
  });

  beforeEach(() => {
    mockedContext = createAppMockRenderer();
    jest.clearAllMocks();
  });

  describe('Step 1 - Case Fields', () => {
    it('renders correctly', async () => {
      const renderResult = mockedContext.render(
        <FormContext onSuccess={onFormSubmitSuccess}>
          <CreateCaseFormFields {...defaultCreateCaseForm} />
          <SubmitCaseButton />
        </FormContext>
      );
      expect(renderResult.getByTestId('caseTitle')).toBeTruthy();
      expect(renderResult.getByTestId('caseSeverity')).toBeTruthy();
      expect(renderResult.getByTestId('caseDescription')).toBeTruthy();
      expect(renderResult.getByTestId('caseTags')).toBeTruthy();
      expect(renderResult.getByTestId('caseConnectors')).toBeTruthy();
      expect(renderResult.getByTestId('case-creation-form-steps')).toBeTruthy();
    });

    it('should post case on submit click', async () => {
      useConnectorsMock.mockReturnValue({
        ...sampleConnectorData,
        connectors: connectorsMock,
      });

      const renderResult = mockedContext.render(
        <FormContext onSuccess={onFormSubmitSuccess}>
          <CreateCaseFormFields {...defaultCreateCaseForm} />
          <SubmitCaseButton />
        </FormContext>
      );

      await fillFormReactTestingLib(renderResult);
      userEvent.click(renderResult.getByTestId('create-case-submit'));
      await waitFor(() => {
        expect(postCase).toBeCalledWith(sampleData);
      });
    });

    it('should post a case on submit click with the selected severity', async () => {
      useConnectorsMock.mockReturnValue({
        ...sampleConnectorData,
        connectors: connectorsMock,
      });

      const renderResult = mockedContext.render(
        <FormContext onSuccess={onFormSubmitSuccess}>
          <CreateCaseFormFields {...defaultCreateCaseForm} />
          <SubmitCaseButton />
        </FormContext>
      );

      await fillFormReactTestingLib(renderResult);

      userEvent.click(renderResult.getByTestId('case-severity-selection'));
      expect(renderResult.getByTestId('case-severity-selection-high')).toBeTruthy();
      userEvent.click(renderResult.getByTestId('case-severity-selection-high'));

      userEvent.click(renderResult.getByTestId('create-case-submit'));
      await waitFor(() => {
        expect(postCase).toBeCalledWith({
          ...sampleData,
          severity: CaseSeverity.HIGH,
        });
      });
    });

    it('does not submits the title when the length is longer than 64 characters', async () => {
      const longTitle =
        'This is a title that should not be saved as it is longer than 64 characters.';

      const wrapper = mount(
        <TestProviders>
          <FormContext onSuccess={onFormSubmitSuccess}>
            <CreateCaseFormFields {...defaultCreateCaseForm} />
            <SubmitCaseButton />
          </FormContext>
        </TestProviders>
      );

      act(() => {
        wrapper
          .find(`[data-test-subj="caseTitle"] input`)
          .first()
          .simulate('change', { target: { value: longTitle } });
        wrapper.find(`[data-test-subj="create-case-submit"]`).first().simulate('click');
      });

      await waitFor(() => {
        wrapper.update();
        expect(wrapper.find('[data-test-subj="caseTitle"] .euiFormErrorText').text()).toBe(
          'The length of the title is too long. The maximum length is 64.'
        );
      });
      expect(postCase).not.toHaveBeenCalled();
    });

    it('should toggle sync settings', async () => {
      useConnectorsMock.mockReturnValue({
        ...sampleConnectorData,
        connectors: connectorsMock,
      });

      const wrapper = mount(
        <TestProviders>
          <FormContext onSuccess={onFormSubmitSuccess}>
            <CreateCaseFormFields {...defaultCreateCaseForm} />
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

    it('should set sync alerts to false when the sync feature setting is false', async () => {
      useConnectorsMock.mockReturnValue({
        ...sampleConnectorData,
        connectors: connectorsMock,
      });

      const wrapper = mount(
        <TestProviders features={{ alerts: { sync: false, enabled: true } }}>
          <FormContext onSuccess={onFormSubmitSuccess}>
            <CreateCaseFormFields {...defaultCreateCaseForm} />
            <SubmitCaseButton />
          </FormContext>
        </TestProviders>
      );

      fillForm(wrapper);
      wrapper.find(`[data-test-subj="create-case-submit"]`).first().simulate('click');

      await waitFor(() =>
        expect(postCase).toBeCalledWith({ ...sampleData, settings: { syncAlerts: false } })
      );
    });

    it('should select LOW as the default severity', async () => {
      const renderResult = mockedContext.render(
        <FormContext onSuccess={onFormSubmitSuccess}>
          <CreateCaseFormFields {...defaultCreateCaseForm} />
          <SubmitCaseButton />
        </FormContext>
      );
      expect(renderResult.getByTestId('caseSeverity')).toBeTruthy();
      // there should be 2 low elements. one for the options popover and one for the displayed one.
      expect(renderResult.getAllByTestId('case-severity-selection-low').length).toBe(2);
    });

    it('should select the default connector set in the configuration', async () => {
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
            <CreateCaseFormFields {...defaultCreateCaseForm} />
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

    it('should default to none if the default connector does not exist in connectors', async () => {
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
            <CreateCaseFormFields {...defaultCreateCaseForm} />
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
    it(`should submit and push to Jira connector`, async () => {
      useConnectorsMock.mockReturnValue({
        ...sampleConnectorData,
        connectors: connectorsMock,
      });

      const wrapper = mount(
        <TestProviders>
          <FormContext onSuccess={onFormSubmitSuccess}>
            <CreateCaseFormFields {...defaultCreateCaseForm} />
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

    it(`should submit and push to resilient connector`, async () => {
      useConnectorsMock.mockReturnValue({
        ...sampleConnectorData,
        connectors: connectorsMock,
      });

      const wrapper = mount(
        <TestProviders>
          <FormContext onSuccess={onFormSubmitSuccess}>
            <CreateCaseFormFields {...defaultCreateCaseForm} />
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
        (
          wrapper.find(EuiComboBox).at(1).props() as unknown as {
            onChange: (a: EuiComboBoxOptionOption[]) => void;
          }
        ).onChange([{ value: '19', label: 'Denial of Service' }]);
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

    it(`should submit and push to servicenow itsm connector`, async () => {
      useConnectorsMock.mockReturnValue({
        ...sampleConnectorData,
        connectors: connectorsMock,
      });

      const wrapper = mount(
        <TestProviders>
          <FormContext onSuccess={onFormSubmitSuccess}>
            <CreateCaseFormFields {...defaultCreateCaseForm} />
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

      // we need the choices response to conditionally show the subcategory select
      act(() => {
        onChoicesSuccess(useGetChoicesResponse.choices);
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

    it(`should submit and push to servicenow sir connector`, async () => {
      useConnectorsMock.mockReturnValue({
        ...sampleConnectorData,
        connectors: connectorsMock,
      });

      const wrapper = mount(
        <TestProviders>
          <FormContext onSuccess={onFormSubmitSuccess}>
            <CreateCaseFormFields {...defaultCreateCaseForm} />
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

      // we need the choices response to conditionally show the subcategory select
      act(() => {
        onChoicesSuccess(useGetChoicesResponse.choices);
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

  it(`should call afterCaseCreated`, async () => {
    useConnectorsMock.mockReturnValue({
      ...sampleConnectorData,
      connectors: connectorsMock,
    });

    const wrapper = mockedContext.render(
      <FormContext onSuccess={onFormSubmitSuccess} afterCaseCreated={afterCaseCreated}>
        <CreateCaseFormFields {...defaultCreateCaseForm} />
        <SubmitCaseButton />
      </FormContext>
    );

    await fillFormReactTestingLib(wrapper);
    expect(wrapper.queryByTestId('connector-fields-jira')).toBeFalsy();
    userEvent.click(wrapper.getByTestId('dropdown-connectors'));
    await act(async () => {
      userEvent.click(wrapper.getByTestId('dropdown-connector-jira-1'));
    });
    expect(wrapper.getByTestId('connector-fields-jira')).toBeTruthy();

    userEvent.click(wrapper.getByTestId('create-case-submit'));
    await waitFor(() => {
      expect(afterCaseCreated).toHaveBeenCalledWith(
        {
          id: sampleId,
          ...sampleData,
        },
        createAttachments
      );
    });
  });

  it('should call createAttachments with the attachments after the case is created', async () => {
    useConnectorsMock.mockReturnValue({
      ...sampleConnectorData,
      connectors: connectorsMock,
    });
    const attachments = [
      {
        alertId: '1234',
        index: '',
        rule: {
          id: '45321',
          name: 'my rule',
        },
        owner: 'owner',
        type: CommentType.alert as const,
      },
      {
        alertId: '7896',
        index: '',
        rule: {
          id: '445324',
          name: 'my rule',
        },
        owner: 'second-owner',
        type: CommentType.alert as const,
      },
    ];

    const wrapper = mockedContext.render(
      <FormContext onSuccess={onFormSubmitSuccess} attachments={attachments}>
        <CreateCaseFormFields {...defaultCreateCaseForm} />
        <SubmitCaseButton />
      </FormContext>
    );

    await fillFormReactTestingLib(wrapper);

    await act(async () => {
      userEvent.click(wrapper.getByTestId('create-case-submit'));
    });

    expect(createAttachments).toHaveBeenCalledTimes(1);
    expect(createAttachments).toHaveBeenCalledWith({ caseId: 'case-id', data: attachments });
  });

  it('should NOT call createAttachments if the attachments are an empty array', async () => {
    useConnectorsMock.mockReturnValue({
      ...sampleConnectorData,
      connectors: connectorsMock,
    });
    const attachments: CaseAttachments = [];

    const wrapper = mockedContext.render(
      <FormContext onSuccess={onFormSubmitSuccess} attachments={attachments}>
        <CreateCaseFormFields {...defaultCreateCaseForm} />
        <SubmitCaseButton />
      </FormContext>
    );

    await fillFormReactTestingLib(wrapper);

    await act(async () => {
      userEvent.click(wrapper.getByTestId('create-case-submit'));
    });

    expect(createAttachments).not.toHaveBeenCalled();
  });

  it(`should call callbacks in correct order`, async () => {
    useConnectorsMock.mockReturnValue({
      ...sampleConnectorData,
      connectors: connectorsMock,
    });
    const attachments = [
      {
        alertId: '1234',
        index: '',
        rule: {
          id: '45321',
          name: 'my rule',
        },
        owner: 'owner',
        type: CommentType.alert as const,
      },
    ];

    const wrapper = mount(
      <TestProviders>
        <FormContext
          onSuccess={onFormSubmitSuccess}
          afterCaseCreated={afterCaseCreated}
          attachments={attachments}
        >
          <CreateCaseFormFields {...defaultCreateCaseForm} />
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
      expect(createAttachments).toHaveBeenCalled();
      expect(afterCaseCreated).toHaveBeenCalled();
      expect(pushCaseToExternalService).toHaveBeenCalled();
      expect(onFormSubmitSuccess).toHaveBeenCalled();
    });

    const postCaseOrder = postCase.mock.invocationCallOrder[0];
    const createAttachmentsOrder = createAttachments.mock.invocationCallOrder[0];
    const afterCaseOrder = afterCaseCreated.mock.invocationCallOrder[0];
    const pushCaseToExternalServiceOrder = pushCaseToExternalService.mock.invocationCallOrder[0];
    const onFormSubmitSuccessOrder = onFormSubmitSuccess.mock.invocationCallOrder[0];

    expect(
      postCaseOrder < createAttachmentsOrder &&
        createAttachmentsOrder < afterCaseOrder &&
        afterCaseOrder < pushCaseToExternalServiceOrder &&
        pushCaseToExternalServiceOrder < onFormSubmitSuccessOrder
    ).toBe(true);
  });

  describe('Permissions', () => {
    it('should not push to service if the user does not have access to actions', async () => {
      mockedContext.coreStart.application.capabilities = {
        ...mockedContext.coreStart.application.capabilities,
        actions: { save: false, show: false },
      };

      const result = mockedContext.render(
        <FormContext onSuccess={onFormSubmitSuccess}>
          <CreateCaseFormFields {...defaultCreateCaseForm} />
          <SubmitCaseButton />
        </FormContext>
      );

      await act(async () => {
        fillFormReactTestingLib(result);
      });

      await act(async () => {
        userEvent.click(result.getByTestId('create-case-submit'));
      });

      expect(pushCaseToExternalService).not.toHaveBeenCalled();
    });
  });
});
