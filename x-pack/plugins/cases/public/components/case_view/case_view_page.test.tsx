/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { ConnectorTypes } from '../../../common/api';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import '../../common/mock/match_media';
import { useCaseViewNavigation, useUrlParams } from '../../common/navigation/hooks';
import { useGetConnectors } from '../../containers/configure/use_connectors';
import { basicCaseClosed, connectorsMock } from '../../containers/mock';
import type { UseGetCase } from '../../containers/use_get_case';
import { useGetCase } from '../../containers/use_get_case';
import { useGetCaseMetrics } from '../../containers/use_get_case_metrics';
import { useGetCaseUserActions } from '../../containers/use_get_case_user_actions';
import { useGetTags } from '../../containers/use_get_tags';
import { usePostPushToService } from '../../containers/use_post_push_to_service';
import { useGetCaseConnectors } from '../../containers/use_get_case_connectors';
import { useUpdateCase } from '../../containers/use_update_case';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';
import { CaseViewPage } from './case_view_page';
import {
  caseData,
  caseViewProps,
  defaultGetCase,
  defaultGetCaseMetrics,
  defaultUpdateCaseState,
  defaultUseGetCaseUserActions,
} from './mocks';
import type { CaseViewPageProps } from './types';
import { userProfiles } from '../../containers/user_profiles/api.mock';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { CASE_VIEW_PAGE_TABS } from '../../../common/types';
import { getCaseConnectorsMockResponse } from '../../common/mock/connectors';

jest.mock('../../containers/use_get_action_license');
jest.mock('../../containers/use_update_case');
jest.mock('../../containers/use_get_case_metrics');
jest.mock('../../containers/use_get_case_user_actions');
jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/use_get_case');
jest.mock('../../containers/configure/use_connectors');
jest.mock('../../containers/use_post_push_to_service');
jest.mock('../../containers/use_get_case_connectors');
jest.mock('../../containers/user_profiles/use_bulk_get_user_profiles');
jest.mock('../user_actions/timestamp', () => ({
  UserActionTimestamp: () => <></>,
}));
jest.mock('../../common/navigation/hooks');
jest.mock('../../common/hooks');
jest.mock('../connectors/resilient/api');

const useFetchCaseMock = useGetCase as jest.Mock;
const useUrlParamsMock = useUrlParams as jest.Mock;
const useCaseViewNavigationMock = useCaseViewNavigation as jest.Mock;
const useUpdateCaseMock = useUpdateCase as jest.Mock;
const useGetCaseUserActionsMock = useGetCaseUserActions as jest.Mock;
const useGetConnectorsMock = useGetConnectors as jest.Mock;
const usePostPushToServiceMock = usePostPushToService as jest.Mock;
const useGetCaseConnectorsMock = useGetCaseConnectors as jest.Mock;
const useGetCaseMetricsMock = useGetCaseMetrics as jest.Mock;
const useGetTagsMock = useGetTags as jest.Mock;
const useBulkGetUserProfilesMock = useBulkGetUserProfiles as jest.Mock;

const mockGetCase = (props: Partial<UseGetCase> = {}) => {
  const data = {
    ...defaultGetCase.data,
    ...props.data,
  };
  useFetchCaseMock.mockReturnValue({
    ...defaultGetCase,
    ...props,
    data,
  });
};

export const caseProps: CaseViewPageProps = {
  ...caseViewProps,
  caseId: caseData.id,
  caseData,
  fetchCase: jest.fn(),
};

export const caseClosedProps: CaseViewPageProps = {
  ...caseProps,
  caseData: basicCaseClosed,
};

describe('CaseViewPage', () => {
  const updateCaseProperty = defaultUpdateCaseState.updateCaseProperty;
  const pushCaseToExternalService = jest.fn();
  const data = caseProps.caseData;
  let appMockRenderer: AppMockRenderer;
  const caseConnectors = getCaseConnectorsMockResponse();

  beforeEach(() => {
    mockGetCase();
    jest.clearAllMocks();
    useUpdateCaseMock.mockReturnValue(defaultUpdateCaseState);
    useGetCaseMetricsMock.mockReturnValue(defaultGetCaseMetrics);
    useGetCaseUserActionsMock.mockReturnValue(defaultUseGetCaseUserActions);
    usePostPushToServiceMock.mockReturnValue({ isLoading: false, pushCaseToExternalService });
    useGetCaseConnectorsMock.mockReturnValue({
      isLoading: false,
      data: caseConnectors,
    });
    useGetConnectorsMock.mockReturnValue({ data: connectorsMock, isLoading: false });
    useGetTagsMock.mockReturnValue({ data: [], isLoading: false });
    useBulkGetUserProfilesMock.mockReturnValue({ data: new Map(), isLoading: false });
    const license = licensingMock.createLicense({
      license: { type: 'platinum' },
    });
    appMockRenderer = createAppMockRenderer({ license });
  });

  it('should render CaseViewPage', async () => {
    const damagedRaccoonUser = userProfiles[0].user;
    const caseDataWithDamagedRaccoon = {
      ...caseData,
      createdBy: {
        profileUid: userProfiles[0].uid,
        username: damagedRaccoonUser.username,
        fullName: damagedRaccoonUser.full_name,
        email: damagedRaccoonUser.email,
      },
    };

    const license = licensingMock.createLicense({
      license: { type: 'platinum' },
    });

    const props = { ...caseProps, caseData: caseDataWithDamagedRaccoon };
    appMockRenderer = createAppMockRenderer({ features: { metrics: ['alerts.count'] }, license });
    const result = appMockRenderer.render(<CaseViewPage {...props} />);

    expect(result.getByTestId('header-page-title')).toHaveTextContent(data.title);
    expect(result.getByTestId('case-view-status-dropdown')).toHaveTextContent('Open');
    expect(result.getByTestId('case-view-metrics-panel')).toBeInTheDocument();
    expect(
      within(result.getByTestId('case-view-tag-list')).getByTestId('tag-coke')
    ).toHaveTextContent(data.tags[0]);

    expect(
      within(result.getByTestId('case-view-tag-list')).getByTestId('tag-pepsi')
    ).toHaveTextContent(data.tags[1]);

    expect(result.getAllByText(data.createdBy.fullName!)[0]).toBeInTheDocument();

    expect(
      within(result.getByTestId('description-action')).getByTestId('user-action-markdown')
    ).toHaveTextContent(data.description);

    expect(result.getByTestId('case-view-status-action-button')).toHaveTextContent(
      'Mark in progress'
    );
  });

  it('should show closed indicators in header when case is closed', async () => {
    useUpdateCaseMock.mockImplementation(() => ({
      ...defaultUpdateCaseState,
      caseData: basicCaseClosed,
    }));

    const result = appMockRenderer.render(<CaseViewPage {...caseClosedProps} />);

    expect(result.getByTestId('case-view-status-dropdown')).toHaveTextContent('Closed');
  });

  it('should update status', async () => {
    const result = appMockRenderer.render(<CaseViewPage {...caseProps} />);

    const dropdown = result.getByTestId('case-view-status-dropdown');
    userEvent.click(dropdown.querySelector('button')!);
    await waitForEuiPopoverOpen();
    userEvent.click(result.getByTestId('case-view-status-dropdown-closed'));
    const updateObject = updateCaseProperty.mock.calls[0][0];

    await waitFor(() => {
      expect(updateCaseProperty).toHaveBeenCalledTimes(1);
      expect(updateObject.updateKey).toEqual('status');
      expect(updateObject.updateValue).toEqual('closed');
    });
  });

  it('should display EditableTitle isLoading', async () => {
    useUpdateCaseMock.mockImplementation(() => ({
      ...defaultUpdateCaseState,
      isLoading: true,
      updateKey: 'title',
    }));
    const result = appMockRenderer.render(<CaseViewPage {...caseProps} />);

    await waitFor(() => {
      expect(result.getByTestId('editable-title-loading')).toBeInTheDocument();
      expect(result.queryByTestId('editable-title-edit-icon')).not.toBeInTheDocument();
    });
  });

  it('should display description isLoading', async () => {
    useUpdateCaseMock.mockImplementation(() => ({
      ...defaultUpdateCaseState,
      isLoading: true,
      updateKey: 'description',
    }));

    const result = appMockRenderer.render(<CaseViewPage {...caseProps} />);

    await waitFor(() => {
      expect(
        within(result.getByTestId('description-action')).getByTestId('user-action-title-loading')
      ).toBeInTheDocument();
      expect(
        within(result.getByTestId('description-action')).queryByTestId('property-actions')
      ).not.toBeInTheDocument();
    });
  });

  it('should display tags isLoading', async () => {
    useUpdateCaseMock.mockImplementation(() => ({
      ...defaultUpdateCaseState,
      isLoading: true,
      updateKey: 'tags',
    }));

    const result = appMockRenderer.render(<CaseViewPage {...caseProps} />);

    await waitFor(() => {
      expect(
        within(result.getByTestId('case-view-tag-list')).getByTestId('tag-list-loading')
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(result.queryByTestId('tag-list-edit')).not.toBeInTheDocument();
    });
  });

  it('should update title', async () => {
    const result = appMockRenderer.render(<CaseViewPage {...caseProps} />);
    const newTitle = 'The new title';
    userEvent.click(result.getByTestId('editable-title-edit-icon'));
    userEvent.clear(result.getByTestId('editable-title-input-field'));
    userEvent.type(result.getByTestId('editable-title-input-field'), newTitle);
    userEvent.click(result.getByTestId('editable-title-submit-btn'));

    const updateObject = updateCaseProperty.mock.calls[0][0];
    await waitFor(() => {
      expect(updateObject.updateKey).toEqual('title');
      expect(updateObject.updateValue).toEqual(newTitle);
    });
  });

  it('should push updates on button click', async () => {
    useGetCaseConnectorsMock.mockImplementation(() => ({
      isLoading: false,
      data: {
        ...caseConnectors,
        'resilient-2': {
          ...caseConnectors['resilient-2'],
          push: { ...caseConnectors['resilient-2'].push, needsToBePushed: true },
        },
      },
    }));

    const result = appMockRenderer.render(<CaseViewPage {...caseProps} />);

    expect(result.getByTestId('push-to-external-service')).toBeInTheDocument();

    userEvent.click(result.getByTestId('push-to-external-service'));

    await waitFor(() => {
      expect(pushCaseToExternalService).toHaveBeenCalled();
    });
  });

  it('should disable the push button when connector is invalid', async () => {
    const result = appMockRenderer.render(
      <CaseViewPage
        {...{
          ...caseProps,
          caseData: { ...caseProps.caseData, connectorId: 'not-exist' },
        }}
      />
    );
    await waitFor(() => {
      expect(result.getByTestId('push-to-external-service')).toBeDisabled();
    });
  });

  it('should update connector', async () => {
    const result = appMockRenderer.render(
      <CaseViewPage
        {...caseProps}
        caseData={{
          ...caseProps.caseData,
          connector: {
            id: 'servicenow-1',
            name: 'SN 1',
            type: ConnectorTypes.serviceNowITSM,
            fields: null,
          },
        }}
      />
    );
    userEvent.click(result.getByTestId('connector-edit').querySelector('button')!);
    userEvent.click(result.getByTestId('dropdown-connectors'));
    await waitForEuiPopoverOpen();
    userEvent.click(result.getByTestId('dropdown-connector-resilient-2'));

    await waitFor(() => {
      expect(result.getByTestId('connector-fields-resilient')).toBeInTheDocument();
    });

    userEvent.click(result.getByTestId('edit-connectors-submit'));

    await waitFor(() => {
      expect(updateCaseProperty).toHaveBeenCalledTimes(1);
      const updateObject = updateCaseProperty.mock.calls[0][0];
      expect(updateObject.updateKey).toEqual('connector');
      expect(updateObject.updateValue).toEqual({
        id: 'resilient-2',
        name: 'My Resilient connector',
        type: ConnectorTypes.resilient,
        fields: {
          incidentTypes: null,
          severityCode: null,
        },
      });
    });
  });

  it('should call onComponentInitialized on mount', async () => {
    const onComponentInitialized = jest.fn();
    appMockRenderer.render(
      <CaseViewPage {...caseProps} onComponentInitialized={onComponentInitialized} />
    );

    await waitFor(() => {
      expect(onComponentInitialized).toHaveBeenCalled();
    });
  });

  it('should show loading content when loading user actions', async () => {
    const useFetchAlertData = jest.fn().mockReturnValue([true]);
    useGetCaseUserActionsMock.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: true,
      isFetching: true,
    });

    const result = appMockRenderer.render(
      <CaseViewPage {...caseProps} useFetchAlertData={useFetchAlertData} />
    );
    await waitFor(() => {
      expect(result.getByTestId('case-view-loading-content')).toBeInTheDocument();
      expect(result.queryByTestId('user-actions')).not.toBeInTheDocument();
    });
  });

  it('should call show alert details with expected arguments', async () => {
    const showAlertDetails = jest.fn();
    const result = appMockRenderer.render(
      <CaseViewPage {...caseProps} showAlertDetails={showAlertDetails} />
    );

    userEvent.click(result.getByTestId('comment-action-show-alert-alert-action-id'));

    await waitFor(() => {
      expect(showAlertDetails).toHaveBeenCalledWith('alert-id-1', 'alert-index-1');
    });
  });

  it('should show the rule name', async () => {
    const result = appMockRenderer.render(<CaseViewPage {...caseProps} />);

    await waitFor(() => {
      expect(
        result
          .getByTestId('user-action-alert-comment-create-action-alert-action-id')
          .querySelector('.euiCommentEvent__headerEvent')
      ).toHaveTextContent('added an alert from Awesome rule');
    });
  });

  it('should update settings', async () => {
    const result = appMockRenderer.render(<CaseViewPage {...caseProps} />);
    userEvent.click(result.getByTestId('sync-alerts-switch'));
    const updateObject = updateCaseProperty.mock.calls[0][0];

    await waitFor(() => {
      expect(updateObject.updateKey).toEqual('settings');
      expect(updateObject.updateValue).toEqual({ syncAlerts: false });
    });
  });

  it('should show the correct connector name on the push button', async () => {
    useGetConnectorsMock.mockImplementation(() => ({ data: connectorsMock, isLoading: false }));

    const result = appMockRenderer.render(
      <CaseViewPage {...{ ...caseProps, connector: { ...caseProps, name: 'old-name' } }} />
    );

    await waitFor(() => {
      expect(result.getByTestId('push-to-external-service')).toHaveTextContent(
        'My Resilient connector'
      );
    });
  });

  describe('Callouts', () => {
    it('it shows the danger callout when a connector has been deleted', async () => {
      useGetConnectorsMock.mockImplementation(() => ({ data: [], isLoading: false }));
      const result = appMockRenderer.render(<CaseViewPage {...caseProps} />);

      expect(result.container.querySelector('.euiCallOut--danger')).toBeInTheDocument();
    });

    it('it does NOT shows the danger callout when connectors are loading', async () => {
      useGetConnectorsMock.mockImplementation(() => ({ data: [], isLoading: true }));
      const result = appMockRenderer.render(<CaseViewPage {...caseProps} />);

      expect(result.container.querySelector('.euiCallOut--danger')).not.toBeInTheDocument();
    });
  });

  describe('Tabs', () => {
    jest.mock('@kbn/kibana-react-plugin/public', () => ({
      useKibana: () => ({
        services: {
          application: {
            capabilities: {
              fakeCases: {
                create_cases: true,
                read_cases: true,
                update_cases: true,
                delete_cases: true,
                push_cases: true,
              },
            },
          },
          cases: {
            ui: {
              getCasesContext: () => null,
            },
            helpers: {
              getUICapabilities: () => ({
                all: true,
                read: true,
                create: true,
                update: true,
                delete: true,
                push: true,
              }),
            },
          },
          notifications: {
            toasts: {
              addDanger: () => {},
            },
          },
        },
      }),
    }));
    it('renders tabs correctly', async () => {
      const result = appMockRenderer.render(<CaseViewPage {...caseProps} />);
      await act(async () => {
        expect(result.getByTestId('case-view-tab-title-alerts')).toBeTruthy();
        expect(result.getByTestId('case-view-tab-title-activity')).toBeTruthy();
      });
    });

    it('renders the activity tab by default', async () => {
      const result = appMockRenderer.render(<CaseViewPage {...caseProps} />);
      await act(async () => {
        expect(result.getByTestId('case-view-tab-content-activity')).toBeTruthy();
      });
    });

    it('renders the alerts tab when the query parameter tabId has alerts', async () => {
      useUrlParamsMock.mockReturnValue({
        urlParams: {
          tabId: CASE_VIEW_PAGE_TABS.ALERTS,
        },
      });
      const result = appMockRenderer.render(<CaseViewPage {...caseProps} />);
      await act(async () => {
        expect(result.getByTestId('case-view-tab-content-alerts')).toBeTruthy();
      });
    });

    it('renders the activity tab when the query parameter tabId has activity', async () => {
      useUrlParamsMock.mockReturnValue({
        urlParams: {
          tabId: CASE_VIEW_PAGE_TABS.ACTIVITY,
        },
      });
      const result = appMockRenderer.render(<CaseViewPage {...caseProps} />);
      await act(async () => {
        expect(result.getByTestId('case-view-tab-content-activity')).toBeTruthy();
      });
    });

    it('renders the activity tab when the query parameter tabId has an unknown value', async () => {
      useUrlParamsMock.mockReturnValue({
        urlParams: {
          tabId: 'what-is-love',
        },
      });
      const result = appMockRenderer.render(<CaseViewPage {...caseProps} />);
      await act(async () => {
        expect(result.getByTestId('case-view-tab-content-activity')).toBeTruthy();
        expect(result.queryByTestId('case-view-tab-content-alerts')).toBeFalsy();
      });
    });

    it('navigates to the activity tab when the activity tab is clicked', async () => {
      const navigateToCaseViewMock = useCaseViewNavigationMock().navigateToCaseView;
      const result = appMockRenderer.render(<CaseViewPage {...caseProps} />);
      userEvent.click(result.getByTestId('case-view-tab-title-activity'));
      await act(async () => {
        expect(navigateToCaseViewMock).toHaveBeenCalledWith({
          detailName: caseData.id,
          tabId: CASE_VIEW_PAGE_TABS.ACTIVITY,
        });
      });
    });

    it('navigates to the alerts tab when the alerts tab is clicked', async () => {
      const navigateToCaseViewMock = useCaseViewNavigationMock().navigateToCaseView;
      const result = appMockRenderer.render(<CaseViewPage {...caseProps} />);
      userEvent.click(result.getByTestId('case-view-tab-title-alerts'));
      await act(async () => {
        expect(navigateToCaseViewMock).toHaveBeenCalledWith({
          detailName: caseData.id,
          tabId: CASE_VIEW_PAGE_TABS.ALERTS,
        });
      });
    });

    it('should display the alerts tab when the feature is enabled', async () => {
      appMockRenderer = createAppMockRenderer({ features: { alerts: { enabled: true } } });
      const result = appMockRenderer.render(<CaseViewPage {...caseProps} />);
      await act(async () => {
        expect(result.queryByTestId('case-view-tab-title-activity')).toBeTruthy();
        expect(result.queryByTestId('case-view-tab-title-alerts')).toBeTruthy();
      });
    });

    it('should not display the alerts tab when the feature is disabled', async () => {
      appMockRenderer = createAppMockRenderer({ features: { alerts: { enabled: false } } });
      const result = appMockRenderer.render(<CaseViewPage {...caseProps} />);
      await act(async () => {
        expect(result.queryByTestId('case-view-tab-title-activity')).toBeTruthy();
        expect(result.queryByTestId('case-view-tab-title-alerts')).toBeFalsy();
      });
    });

    it('should not show the experimental badge on the alerts table', async () => {
      appMockRenderer = createAppMockRenderer({ features: { alerts: { isExperimental: false } } });
      const result = appMockRenderer.render(<CaseViewPage {...caseProps} />);

      await act(async () => {
        expect(result.queryByTestId('case-view-alerts-table-experimental-badge')).toBeFalsy();
      });
    });

    it('should show the experimental badge on the alerts table', async () => {
      appMockRenderer = createAppMockRenderer({ features: { alerts: { isExperimental: true } } });
      const result = appMockRenderer.render(<CaseViewPage {...caseProps} />);

      await act(async () => {
        expect(result.queryByTestId('case-view-alerts-table-experimental-badge')).toBeTruthy();
      });
    });
  });
});
