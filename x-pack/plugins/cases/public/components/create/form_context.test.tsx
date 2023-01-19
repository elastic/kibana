/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Screen } from '@testing-library/react';
import { waitFor, within, screen } from '@testing-library/react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

import { CaseSeverity, CommentType, ConnectorTypes } from '../../../common/api';
import { useKibana } from '../../common/lib/kibana';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { usePostCase } from '../../containers/use_post_case';
import { useCreateAttachments } from '../../containers/use_create_attachments';
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
import type { CreateCaseFormFieldsProps } from './form';
import { CreateCaseFormFields } from './form';
import { SubmitCaseButton } from './submit_button';
import { usePostPushToService } from '../../containers/use_post_push_to_service';
import userEvent from '@testing-library/user-event';
import { connectorsMock } from '../../common/mock/connectors';
import type { CaseAttachments } from '../../types';
import { useGetConnectors } from '../../containers/configure/use_connectors';
import { useGetTags } from '../../containers/use_get_tags';
import { waitForComponentToUpdate } from '../../common/test_utils';
import { userProfiles } from '../../containers/user_profiles/api.mock';
import { useLicense } from '../../common/use_license';

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
jest.mock('../../containers/user_profiles/api');
jest.mock('../../common/use_license');

const useGetConnectorsMock = useGetConnectors as jest.Mock;
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
const useLicenseMock = useLicense as jest.Mock;

const sampleId = 'case-id';

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

const sampleDataWithoutTags = {
  ...sampleData,
  tags: [],
};

const fillFormReactTestingLib = async ({
  renderer,
  withTags = false,
}: {
  renderer: Screen;
  withTags?: boolean;
}) => {
  const titleInput = within(renderer.getByTestId('caseTitle')).getByTestId('input');

  userEvent.paste(titleInput, sampleDataWithoutTags.title);

  const descriptionInput = within(renderer.getByTestId('caseDescription')).getByTestId(
    'euiMarkdownEditorTextArea'
  );

  userEvent.paste(descriptionInput, sampleDataWithoutTags.description);

  if (withTags) {
    const caseTags = renderer.getByTestId('caseTags');

    for (const tag of sampleTags) {
      const tagsInput = await within(caseTags).findByTestId('comboBoxInput');
      userEvent.type(tagsInput, `${tag}{enter}`);
    }
  }
};

const waitForFormToRender = async (renderer: Screen) => {
  await waitFor(() => {
    expect(renderer.getByTestId('caseTitle')).toBeTruthy();
  });
};

// FLAKY: https://github.com/elastic/kibana/issues/146394
describe.skip('Create case', () => {
  const refetch = jest.fn();
  const onFormSubmitSuccess = jest.fn();
  const afterCaseCreated = jest.fn();
  const createAttachments = jest.fn();
  let mockedContext: AppMockRenderer;

  beforeAll(() => {
    postCase.mockResolvedValue({
      id: sampleId,
      ...sampleDataWithoutTags,
    });
    usePostCaseMock.mockImplementation(() => defaultPostCase);
    useCreateAttachmentsMock.mockImplementation(() => ({ createAttachments }));
    usePostPushToServiceMock.mockImplementation(() => defaultPostPushToService);
    useGetConnectorsMock.mockReturnValue(sampleConnectorData);
    useCaseConfigureMock.mockImplementation(() => useCaseConfigureResponse);
    useGetIncidentTypesMock.mockReturnValue(useGetIncidentTypesResponse);
    useGetSeverityMock.mockReturnValue(useGetSeverityResponse);
    useGetIssueTypesMock.mockReturnValue(useGetIssueTypesResponse);
    useGetFieldsByIssueTypeMock.mockReturnValue(useGetFieldsByIssueTypeResponse);
    useGetChoicesMock.mockReturnValue(useGetChoicesResponse);

    (useGetTags as jest.Mock).mockImplementation(() => ({
      data: sampleTags,
      refetch,
    }));

    useKibanaMock().services.triggersActionsUi.actionTypeRegistry.get = jest.fn().mockReturnValue({
      actionTypeTitle: '.servicenow',
      iconClass: 'logoSecurity',
    });

    useLicenseMock.mockReturnValue({ isAtLeastPlatinum: () => true });
  });

  beforeEach(() => {
    mockedContext = createAppMockRenderer();
    jest.clearAllMocks();
  });

  describe('Step 1 - Case Fields', () => {
    it('renders correctly', async () => {
      mockedContext.render(
        <FormContext onSuccess={onFormSubmitSuccess}>
          <CreateCaseFormFields {...defaultCreateCaseForm} />
          <SubmitCaseButton />
        </FormContext>
      );

      await waitForFormToRender(screen);

      expect(screen.getByTestId('caseTitle')).toBeTruthy();
      expect(screen.getByTestId('caseSeverity')).toBeTruthy();
      expect(screen.getByTestId('caseDescription')).toBeTruthy();
      expect(screen.getByTestId('createCaseAssigneesComboBox')).toBeTruthy();
      expect(screen.getByTestId('caseTags')).toBeTruthy();
      expect(screen.getByTestId('caseConnectors')).toBeTruthy();
      expect(screen.getByTestId('case-creation-form-steps')).toBeTruthy();
    });

    it('should post case on submit click', async () => {
      useGetConnectorsMock.mockReturnValue({
        ...sampleConnectorData,
        data: connectorsMock,
      });

      mockedContext.render(
        <FormContext onSuccess={onFormSubmitSuccess}>
          <CreateCaseFormFields {...defaultCreateCaseForm} />
          <SubmitCaseButton />
        </FormContext>
      );

      await waitForFormToRender(screen);
      await fillFormReactTestingLib({ renderer: screen, withTags: true });

      userEvent.click(screen.getByTestId('create-case-submit'));

      await waitFor(() => {
        expect(postCase).toHaveBeenCalled();
      });

      expect(postCase).toBeCalledWith({ ...sampleDataWithoutTags, tags: sampleTags });
    });

    it('should post a case on submit click with the selected severity', async () => {
      useGetConnectorsMock.mockReturnValue({
        ...sampleConnectorData,
        data: connectorsMock,
      });

      mockedContext.render(
        <FormContext onSuccess={onFormSubmitSuccess}>
          <CreateCaseFormFields {...defaultCreateCaseForm} />
          <SubmitCaseButton />
        </FormContext>
      );

      await waitForFormToRender(screen);
      await fillFormReactTestingLib({ renderer: screen });

      userEvent.click(screen.getByTestId('case-severity-selection'));
      await waitForEuiPopoverOpen();

      expect(screen.getByTestId('case-severity-selection-high')).toBeVisible();

      userEvent.click(screen.getByTestId('case-severity-selection-high'));
      userEvent.click(screen.getByTestId('create-case-submit'));

      await waitFor(() => {
        expect(postCase).toHaveBeenCalled();
      });

      expect(postCase).toBeCalledWith({
        ...sampleDataWithoutTags,
        severity: CaseSeverity.HIGH,
      });
    });

    it('does not submits the title when the length is longer than 160 characters', async () => {
      const longTitle = 'a'.repeat(161);

      mockedContext.render(
        <FormContext onSuccess={onFormSubmitSuccess}>
          <CreateCaseFormFields {...defaultCreateCaseForm} />
          <SubmitCaseButton />
        </FormContext>
      );

      await waitForFormToRender(screen);

      const titleInput = within(screen.getByTestId('caseTitle')).getByTestId('input');
      userEvent.paste(titleInput, longTitle);

      userEvent.click(screen.getByTestId('create-case-submit'));

      await waitFor(() => {
        expect(
          screen.getByText('The length of the title is too long. The maximum length is 160.')
        ).toBeInTheDocument();
      });

      expect(postCase).not.toHaveBeenCalled();
    });

    it('should toggle sync settings', async () => {
      useGetConnectorsMock.mockReturnValue({
        ...sampleConnectorData,
        data: connectorsMock,
      });

      mockedContext.render(
        <FormContext onSuccess={onFormSubmitSuccess}>
          <CreateCaseFormFields {...defaultCreateCaseForm} />
          <SubmitCaseButton />
        </FormContext>
      );

      await waitForFormToRender(screen);
      await fillFormReactTestingLib({ renderer: screen });

      const syncAlertsButton = within(screen.getByTestId('caseSyncAlerts')).getByTestId('input');

      userEvent.click(syncAlertsButton);
      userEvent.click(screen.getByTestId('create-case-submit'));

      await waitFor(() => expect(postCase).toHaveBeenCalled());

      expect(postCase).toBeCalledWith({
        ...sampleDataWithoutTags,
        settings: { syncAlerts: false },
      });
    });

    it('should set sync alerts to false when the sync feature setting is false', async () => {
      mockedContext = createAppMockRenderer({
        features: { alerts: { sync: false, enabled: true } },
      });

      useGetConnectorsMock.mockReturnValue({
        ...sampleConnectorData,
        data: connectorsMock,
      });

      mockedContext.render(
        <FormContext onSuccess={onFormSubmitSuccess}>
          <CreateCaseFormFields {...defaultCreateCaseForm} />
          <SubmitCaseButton />
        </FormContext>
      );

      await waitForFormToRender(screen);
      await fillFormReactTestingLib({ renderer: screen });

      userEvent.click(screen.getByTestId('create-case-submit'));

      await waitFor(() => expect(postCase).toHaveBeenCalled());

      expect(postCase).toBeCalledWith({
        ...sampleDataWithoutTags,
        settings: { syncAlerts: false },
      });
    });

    it('should select LOW as the default severity', async () => {
      mockedContext.render(
        <FormContext onSuccess={onFormSubmitSuccess}>
          <CreateCaseFormFields {...defaultCreateCaseForm} />
          <SubmitCaseButton />
        </FormContext>
      );

      await waitForFormToRender(screen);

      expect(screen.getByTestId('caseSeverity')).toBeTruthy();
      // there should be 2 low elements. one for the options popover and one for the displayed one.
      expect(screen.getAllByTestId('case-severity-selection-low').length).toBe(2);

      await waitForComponentToUpdate();
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

      useGetConnectorsMock.mockReturnValue({
        ...sampleConnectorData,
        data: connectorsMock,
      });

      mockedContext.render(
        <FormContext onSuccess={onFormSubmitSuccess}>
          <CreateCaseFormFields {...defaultCreateCaseForm} />
          <SubmitCaseButton />
        </FormContext>
      );

      await waitForFormToRender(screen);
      await fillFormReactTestingLib({ renderer: screen });

      userEvent.click(screen.getByTestId('create-case-submit'));

      await waitFor(() => expect(postCase).toHaveBeenCalled());

      expect(postCase).toBeCalledWith({
        ...sampleDataWithoutTags,
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
      });
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

      useGetConnectorsMock.mockReturnValue({
        ...sampleConnectorData,
        data: connectorsMock,
      });

      mockedContext.render(
        <FormContext onSuccess={onFormSubmitSuccess}>
          <CreateCaseFormFields {...defaultCreateCaseForm} />
          <SubmitCaseButton />
        </FormContext>
      );

      await waitForFormToRender(screen);
      await fillFormReactTestingLib({ renderer: screen });

      userEvent.click(screen.getByTestId('create-case-submit'));

      await waitFor(() => {
        expect(postCase).toBeCalled();
        expect(pushCaseToExternalService).not.toHaveBeenCalled();
      });

      expect(pushCaseToExternalService).not.toHaveBeenCalled();
      expect(postCase).toBeCalledWith(sampleDataWithoutTags);
    });
  });

  // FLAKY: https://github.com/elastic/kibana/issues/143408
  describe.skip('Step 2 - Connector Fields', () => {
    it(`should submit and push to resilient connector`, async () => {
      useGetConnectorsMock.mockReturnValue({
        ...sampleConnectorData,
        data: connectorsMock,
      });

      mockedContext.render(
        <FormContext onSuccess={onFormSubmitSuccess}>
          <CreateCaseFormFields {...defaultCreateCaseForm} />
          <SubmitCaseButton />
        </FormContext>
      );

      await waitForFormToRender(screen);
      await fillFormReactTestingLib({ renderer: screen });

      userEvent.click(screen.getByTestId('dropdown-connectors'));

      await waitFor(() => {
        expect(screen.getByTestId('dropdown-connector-resilient-2')).toBeInTheDocument();
      });

      userEvent.click(screen.getByTestId('dropdown-connector-resilient-2'), undefined, {
        skipPointerEventsCheck: true,
      });

      await waitFor(() => {
        expect(screen.getByTestId('incidentTypeComboBox')).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Low' }));
      });

      const checkbox = within(screen.getByTestId('incidentTypeComboBox')).getByTestId(
        'comboBoxSearchInput'
      );

      userEvent.type(checkbox, 'Denial of Service{enter}');
      userEvent.selectOptions(screen.getByTestId('severitySelect'), ['4']);
      userEvent.click(screen.getByTestId('create-case-submit'));

      await waitFor(() => {
        expect(postCase).toHaveBeenCalled();
        expect(pushCaseToExternalService).toHaveBeenCalled();
        expect(onFormSubmitSuccess).toHaveBeenCalled();
      });

      expect(postCase).toBeCalledWith({
        ...sampleDataWithoutTags,
        connector: {
          id: 'resilient-2',
          name: 'My Connector 2',
          type: '.resilient',
          fields: { incidentTypes: ['21'], severityCode: '4' },
        },
      });

      expect(pushCaseToExternalService).toHaveBeenCalledWith({
        caseId: sampleId,
        connector: {
          id: 'resilient-2',
          name: 'My Connector 2',
          type: '.resilient',
          fields: { incidentTypes: ['21'], severityCode: '4' },
        },
      });

      expect(onFormSubmitSuccess).toHaveBeenCalledWith({
        id: sampleId,
        ...sampleDataWithoutTags,
      });
    });
  });

  it(`should call afterCaseCreated`, async () => {
    useGetConnectorsMock.mockReturnValue({
      ...sampleConnectorData,
      data: connectorsMock,
    });

    mockedContext.render(
      <FormContext onSuccess={onFormSubmitSuccess} afterCaseCreated={afterCaseCreated}>
        <CreateCaseFormFields {...defaultCreateCaseForm} />
        <SubmitCaseButton />
      </FormContext>
    );

    await waitForFormToRender(screen);
    await fillFormReactTestingLib({ renderer: screen });

    userEvent.click(screen.getByTestId('dropdown-connectors'));

    await waitFor(() => {
      expect(screen.getByTestId('dropdown-connector-jira-1')).toBeInTheDocument();
    });

    userEvent.click(screen.getByTestId('dropdown-connector-jira-1'), undefined, {
      skipPointerEventsCheck: true,
    });
    userEvent.click(screen.getByTestId('create-case-submit'));

    await waitFor(() => {
      expect(afterCaseCreated).toHaveBeenCalled();
    });

    expect(afterCaseCreated).toHaveBeenCalledWith(
      {
        id: sampleId,
        ...sampleDataWithoutTags,
      },
      createAttachments
    );
  });

  it('should call createAttachments with the attachments after the case is created', async () => {
    useGetConnectorsMock.mockReturnValue({
      ...sampleConnectorData,
      data: connectorsMock,
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

    mockedContext.render(
      <FormContext onSuccess={onFormSubmitSuccess} attachments={attachments}>
        <CreateCaseFormFields {...defaultCreateCaseForm} />
        <SubmitCaseButton />
      </FormContext>
    );

    await waitForFormToRender(screen);
    await fillFormReactTestingLib({ renderer: screen });

    userEvent.click(screen.getByTestId('create-case-submit'));

    await waitFor(() => {
      expect(createAttachments).toHaveBeenCalledTimes(1);
    });

    expect(createAttachments).toHaveBeenCalledWith({
      caseId: 'case-id',
      data: attachments,
      caseOwner: 'securitySolution',
    });
  });

  it('should NOT call createAttachments if the attachments are an empty array', async () => {
    useGetConnectorsMock.mockReturnValue({
      ...sampleConnectorData,
      data: connectorsMock,
    });
    const attachments: CaseAttachments = [];

    mockedContext.render(
      <FormContext onSuccess={onFormSubmitSuccess} attachments={attachments}>
        <CreateCaseFormFields {...defaultCreateCaseForm} />
        <SubmitCaseButton />
      </FormContext>
    );

    await waitForFormToRender(screen);
    await fillFormReactTestingLib({ renderer: screen });

    userEvent.click(screen.getByTestId('create-case-submit'));

    await waitForComponentToUpdate();

    expect(createAttachments).not.toHaveBeenCalled();
  });

  it(`should call callbacks in correct order`, async () => {
    useGetConnectorsMock.mockReturnValue({
      ...sampleConnectorData,
      data: connectorsMock,
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

    mockedContext.render(
      <FormContext
        onSuccess={onFormSubmitSuccess}
        afterCaseCreated={afterCaseCreated}
        attachments={attachments}
      >
        <CreateCaseFormFields {...defaultCreateCaseForm} />
        <SubmitCaseButton />
      </FormContext>
    );

    await waitForFormToRender(screen);
    await fillFormReactTestingLib({ renderer: screen });

    userEvent.click(screen.getByTestId('dropdown-connectors'));

    await waitFor(() => {
      expect(screen.getByTestId('dropdown-connector-jira-1')).toBeInTheDocument();
    });

    userEvent.click(screen.getByTestId('dropdown-connector-jira-1'), undefined, {
      skipPointerEventsCheck: true,
    });

    userEvent.click(screen.getByTestId('create-case-submit'));

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

      mockedContext.render(
        <FormContext onSuccess={onFormSubmitSuccess}>
          <CreateCaseFormFields {...defaultCreateCaseForm} />
          <SubmitCaseButton />
        </FormContext>
      );

      await waitForFormToRender(screen);
      await fillFormReactTestingLib({ renderer: screen });

      userEvent.click(screen.getByTestId('create-case-submit'));

      await waitForComponentToUpdate();
      expect(pushCaseToExternalService).not.toHaveBeenCalled();
    });
  });

  describe('Assignees', () => {
    it('should submit assignees', async () => {
      mockedContext.render(
        <FormContext onSuccess={onFormSubmitSuccess}>
          <CreateCaseFormFields {...defaultCreateCaseForm} />
          <SubmitCaseButton />
        </FormContext>
      );

      await waitForFormToRender(screen);
      await fillFormReactTestingLib({ renderer: screen });

      const assigneesComboBox = within(screen.getByTestId('createCaseAssigneesComboBox'));

      await waitFor(() => {
        expect(assigneesComboBox.getByTestId('comboBoxSearchInput')).not.toBeDisabled();
      });

      userEvent.paste(assigneesComboBox.getByTestId('comboBoxSearchInput'), 'dr');

      await waitFor(() => {
        expect(
          screen.getByTestId('comboBoxOptionsList createCaseAssigneesComboBox-optionsList')
        ).toBeInTheDocument();
      });

      userEvent.click(await screen.findByText(`${userProfiles[0].user.full_name}`));
      userEvent.click(screen.getByTestId('create-case-submit'));

      await waitFor(() => {
        expect(postCase).toHaveBeenCalled();
      });

      expect(postCase).toBeCalledWith({
        ...sampleDataWithoutTags,
        assignees: [{ uid: userProfiles[0].uid }],
      });
    });

    it('should not render the assignees on basic license', async () => {
      useLicenseMock.mockReturnValue({ isAtLeastPlatinum: () => false });

      mockedContext.render(
        <FormContext onSuccess={onFormSubmitSuccess}>
          <CreateCaseFormFields {...defaultCreateCaseForm} />
          <SubmitCaseButton />
        </FormContext>
      );

      await waitForFormToRender(screen);
      await waitForComponentToUpdate();

      expect(screen.queryByTestId('createCaseAssigneesComboBox')).toBeNull();
    });
  });
});
