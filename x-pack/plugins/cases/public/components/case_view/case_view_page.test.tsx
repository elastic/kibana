/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, within, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import '../../common/mock/match_media';
import { useCaseViewNavigation, useUrlParams } from '../../common/navigation/hooks';
import { useGetSupportedActionConnectors } from '../../containers/configure/use_get_supported_action_connectors';
import { basicCaseClosed, connectorsMock, getCaseUsersMockResponse } from '../../containers/mock';
import type { UseGetCase } from '../../containers/use_get_case';
import { useGetCase } from '../../containers/use_get_case';
import { useGetCaseMetrics } from '../../containers/use_get_case_metrics';
import { useFindCaseUserActions } from '../../containers/use_find_case_user_actions';
import { useGetTags } from '../../containers/use_get_tags';
import { usePostPushToService } from '../../containers/use_post_push_to_service';
import { useGetCaseConnectors } from '../../containers/use_get_case_connectors';
import { useUpdateCase } from '../../containers/use_update_case';
import { useGetCaseUsers } from '../../containers/use_get_case_users';
import { CaseViewPage } from './case_view_page';
import {
  caseData,
  caseViewProps,
  defaultGetCase,
  defaultGetCaseMetrics,
  defaultInfiniteUseFindCaseUserActions,
  defaultUpdateCaseState,
  defaultUseFindCaseUserActions,
} from './mocks';
import type { CaseViewPageProps } from './types';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { CASE_VIEW_PAGE_TABS } from '../../../common/types';
import { getCaseConnectorsMockResponse } from '../../common/mock/connectors';
import { useInfiniteFindCaseUserActions } from '../../containers/use_infinite_find_case_user_actions';
import { useGetCaseUserActionsStats } from '../../containers/use_get_case_user_actions_stats';
import { createQueryWithMarkup } from '../../common/test_utils';
import { useCasesFeatures } from '../../common/use_cases_features';
import { CaseMetricsFeature } from '../../../common/types/api';

jest.mock('../../containers/use_get_action_license');
jest.mock('../../containers/use_update_case');
jest.mock('../../containers/use_get_case_metrics');
jest.mock('../../containers/use_find_case_user_actions');
jest.mock('../../containers/use_infinite_find_case_user_actions');
jest.mock('../../containers/use_get_case_user_actions_stats');
jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/use_get_case');
jest.mock('../../containers/configure/use_get_supported_action_connectors');
jest.mock('../../containers/use_post_push_to_service');
jest.mock('../../containers/use_get_case_connectors');
jest.mock('../../containers/use_get_case_users');
jest.mock('../../containers/user_profiles/use_bulk_get_user_profiles');
jest.mock('../../common/use_cases_features');
jest.mock('../user_actions/timestamp', () => ({
  UserActionTimestamp: () => <></>,
}));
jest.mock('../../common/navigation/hooks');
jest.mock('../../common/hooks');
jest.mock('../connectors/resilient/api');
jest.mock('../../common/lib/kibana');

const useFetchCaseMock = useGetCase as jest.Mock;
const useUrlParamsMock = useUrlParams as jest.Mock;
const useCaseViewNavigationMock = useCaseViewNavigation as jest.Mock;
const useUpdateCaseMock = useUpdateCase as jest.Mock;
const useFindCaseUserActionsMock = useFindCaseUserActions as jest.Mock;
const useInfiniteFindCaseUserActionsMock = useInfiniteFindCaseUserActions as jest.Mock;
const useGetCaseUserActionsStatsMock = useGetCaseUserActionsStats as jest.Mock;
const useGetConnectorsMock = useGetSupportedActionConnectors as jest.Mock;
const usePostPushToServiceMock = usePostPushToService as jest.Mock;
const useGetCaseConnectorsMock = useGetCaseConnectors as jest.Mock;
const useGetCaseMetricsMock = useGetCaseMetrics as jest.Mock;
const useGetTagsMock = useGetTags as jest.Mock;
const useGetCaseUsersMock = useGetCaseUsers as jest.Mock;
const useCasesFeaturesMock = useCasesFeatures as jest.Mock;

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

const userActionsStats = {
  total: 21,
  totalComments: 9,
  totalOtherActions: 11,
};

describe('CaseViewPage', () => {
  const updateCaseProperty = defaultUpdateCaseState.mutate;
  const pushCaseToExternalService = jest.fn();
  const caseConnectors = getCaseConnectorsMockResponse();
  const caseUsers = getCaseUsersMockResponse();

  let appMockRenderer: AppMockRenderer;

  // eslint-disable-next-line prefer-object-spread
  const originalGetComputedStyle = Object.assign({}, window.getComputedStyle);

  const platinumLicense = licensingMock.createLicense({
    license: { type: 'platinum' },
  });

  beforeAll(() => {
    // The JSDOM implementation is too slow
    // Especially for dropdowns that try to position themselves
    // perf issue - https://github.com/jsdom/jsdom/issues/3234
    Object.defineProperty(window, 'getComputedStyle', {
      value: (el: HTMLElement) => {
        /**
         * This is based on the jsdom implementation of getComputedStyle
         * https://github.com/jsdom/jsdom/blob/9dae17bf0ad09042cfccd82e6a9d06d3a615d9f4/lib/jsdom/browser/Window.js#L779-L820
         *
         * It is missing global style parsing and will only return styles applied directly to an element.
         * Will not return styles that are global or from emotion
         */
        const declaration = new CSSStyleDeclaration();
        const { style } = el;

        Array.prototype.forEach.call(style, (property: string) => {
          declaration.setProperty(
            property,
            style.getPropertyValue(property),
            style.getPropertyPriority(property)
          );
        });

        return declaration;
      },
      configurable: true,
      writable: true,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCase();
    useUpdateCaseMock.mockReturnValue(defaultUpdateCaseState);
    useGetCaseMetricsMock.mockReturnValue(defaultGetCaseMetrics);
    useFindCaseUserActionsMock.mockReturnValue(defaultUseFindCaseUserActions);
    useInfiniteFindCaseUserActionsMock.mockReturnValue(defaultInfiniteUseFindCaseUserActions);
    useGetCaseUserActionsStatsMock.mockReturnValue({ data: userActionsStats, isLoading: false });
    usePostPushToServiceMock.mockReturnValue({
      isLoading: false,
      mutateAsync: pushCaseToExternalService,
    });
    useGetCaseConnectorsMock.mockReturnValue({
      isLoading: false,
      data: caseConnectors,
    });
    useGetConnectorsMock.mockReturnValue({ data: connectorsMock, isLoading: false });
    useGetTagsMock.mockReturnValue({ data: [], isLoading: false });
    useGetCaseUsersMock.mockReturnValue({ isLoading: false, data: caseUsers });
    useCasesFeaturesMock.mockReturnValue({
      metricsFeatures: [CaseMetricsFeature.ALERTS_COUNT],
      pushToServiceAuthorized: true,
      caseAssignmentAuthorized: true,
      isAlertsEnabled: true,
      isSyncAlertsEnabled: true,
    });

    appMockRenderer = createAppMockRenderer({ license: platinumLicense });
  });

  afterAll(() => {
    Object.defineProperty(window, 'getComputedStyle', originalGetComputedStyle);
  });

  it('shows the metrics section', async () => {
    appMockRenderer.render(<CaseViewPage {...caseProps} />);

    expect(await screen.findByTestId('case-view-metrics-panel')).toBeInTheDocument();
  });

  it('should show closed indicators in header when case is closed', async () => {
    useUpdateCaseMock.mockImplementation(() => ({
      ...defaultUpdateCaseState,
      caseData: basicCaseClosed,
    }));

    appMockRenderer.render(<CaseViewPage {...caseClosedProps} />);

    expect(await screen.findByTestId('case-view-status-dropdown')).toHaveTextContent('Closed');
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

    appMockRenderer.render(<CaseViewPage {...caseProps} />);

    expect(await screen.findByTestId('edit-connectors')).toBeInTheDocument();
    expect(await screen.findByTestId('push-to-external-service')).toBeInTheDocument();

    userEvent.click(screen.getByTestId('push-to-external-service'));

    await waitFor(() => {
      expect(pushCaseToExternalService).toHaveBeenCalled();
    });
  });

  it('should disable the push button when connector is invalid', async () => {
    appMockRenderer.render(
      <CaseViewPage
        {...{
          ...caseProps,
          caseData: { ...caseProps.caseData, connectorId: 'not-exist' },
        }}
      />
    );

    expect(await screen.findByTestId('edit-connectors')).toBeInTheDocument();
    expect(await screen.findByTestId('push-to-external-service')).toBeDisabled();
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

  it('should show loading content when loading user actions stats', async () => {
    const useFetchAlertData = jest.fn().mockReturnValue([true]);
    useGetCaseUserActionsStatsMock.mockReturnValue({ isLoading: true });

    appMockRenderer.render(<CaseViewPage {...caseProps} useFetchAlertData={useFetchAlertData} />);

    expect(await screen.findByTestId('case-view-loading-content')).toBeInTheDocument();
    expect(screen.queryByTestId('user-actions-list')).not.toBeInTheDocument();
  });

  it('should call show alert details with expected arguments', async () => {
    const showAlertDetails = jest.fn();
    appMockRenderer.render(<CaseViewPage {...caseProps} showAlertDetails={showAlertDetails} />);

    userEvent.click((await screen.findAllByTestId('comment-action-show-alert-alert-action-id'))[1]);

    await waitFor(() => {
      expect(showAlertDetails).toHaveBeenCalledWith('alert-id-1', 'alert-index-1');
    });
  });

  it('should show the rule name', async () => {
    appMockRenderer.render(<CaseViewPage {...caseProps} />);

    expect(
      (
        await screen.findAllByTestId('user-action-alert-comment-create-action-alert-action-id')
      )[1].querySelector('.euiCommentEvent__headerEvent')
    ).toHaveTextContent('added an alert from Awesome rule');
  });

  it('should update settings', async () => {
    appMockRenderer.render(<CaseViewPage {...caseProps} />);

    userEvent.click(await screen.findByTestId('sync-alerts-switch'));

    await waitFor(() => {
      const updateObject = updateCaseProperty.mock.calls[0][0];

      expect(updateObject.updateKey).toEqual('settings');
      expect(updateObject.updateValue).toEqual({ syncAlerts: false });
    });
  });

  it('should show the correct connector name on the push button', async () => {
    useGetConnectorsMock.mockImplementation(() => ({ data: connectorsMock, isLoading: false }));

    appMockRenderer.render(
      <CaseViewPage {...{ ...caseProps, connector: { ...caseProps, name: 'old-name' } }} />
    );

    expect(await screen.findByTestId('edit-connectors')).toBeInTheDocument();
    expect(await screen.findByText('Update My Resilient connector incident')).toBeInTheDocument();
  });

  describe('Callouts', () => {
    const errorText =
      'The connector used to send updates to the external service has been deleted or you do not have the appropriate licenseExternal link(opens in a new tab or window) to use it. To update cases in external systems, select a different connector or create a new one.';

    it('it shows the danger callout when a connector has been deleted', async () => {
      useGetConnectorsMock.mockImplementation(() => ({ data: [], isLoading: false }));
      appMockRenderer.render(<CaseViewPage {...caseProps} />);

      expect(await screen.findByTestId('edit-connectors')).toBeInTheDocument();

      const getByText = createQueryWithMarkup(screen.getByText);
      expect(getByText(errorText)).toBeInTheDocument();
    });

    it('it does NOT shows the danger callout when connectors are loading', async () => {
      useGetConnectorsMock.mockImplementation(() => ({ data: [], isLoading: true }));
      appMockRenderer.render(<CaseViewPage {...caseProps} />);

      expect(await screen.findByTestId('edit-connectors')).toBeInTheDocument();
      expect(
        screen.queryByTestId('case-callout-a25a5b368b6409b179ef4b6c5168244f')
      ).not.toBeInTheDocument();
    });
  });

  describe('Tabs', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders tabs correctly', async () => {
      appMockRenderer.render(<CaseViewPage {...caseProps} />);

      expect(await screen.findByRole('tablist')).toBeInTheDocument();

      expect(await screen.findByTestId('case-view-tab-title-activity')).toBeInTheDocument();
      expect(await screen.findByTestId('case-view-tab-title-alerts')).toBeInTheDocument();
      expect(await screen.findByTestId('case-view-tab-title-files')).toBeInTheDocument();
    });

    it('renders the activity tab by default', async () => {
      appMockRenderer.render(<CaseViewPage {...caseProps} />);
      expect(await screen.findByTestId('case-view-tab-content-activity')).toBeInTheDocument();
    });

    it('renders the alerts tab when the query parameter tabId has alerts', async () => {
      useUrlParamsMock.mockReturnValue({
        urlParams: {
          tabId: CASE_VIEW_PAGE_TABS.ALERTS,
        },
      });

      appMockRenderer.render(<CaseViewPage {...caseProps} />);

      expect(await screen.findByTestId('case-view-tab-content-alerts')).toBeInTheDocument();
      expect(await screen.findByTestId('alerts-table')).toBeInTheDocument();
    });

    it('renders the activity tab when the query parameter tabId has activity', async () => {
      useUrlParamsMock.mockReturnValue({
        urlParams: {
          tabId: CASE_VIEW_PAGE_TABS.ACTIVITY,
        },
      });

      appMockRenderer.render(<CaseViewPage {...caseProps} />);

      expect(await screen.findByTestId('case-view-tab-content-activity')).toBeInTheDocument();
    });

    it('renders the activity tab when the query parameter tabId has an unknown value', async () => {
      useUrlParamsMock.mockReturnValue({
        urlParams: {
          tabId: 'what-is-love',
        },
      });

      appMockRenderer.render(<CaseViewPage {...caseProps} />);

      expect(await screen.findByTestId('case-view-tab-content-activity')).toBeInTheDocument();
      expect(screen.queryByTestId('case-view-tab-content-alerts')).not.toBeInTheDocument();
    });

    it('navigates to the activity tab when the activity tab is clicked', async () => {
      const navigateToCaseViewMock = useCaseViewNavigationMock().navigateToCaseView;
      appMockRenderer.render(<CaseViewPage {...caseProps} />);

      userEvent.click(await screen.findByTestId('case-view-tab-title-activity'));

      await waitFor(() => {
        expect(navigateToCaseViewMock).toHaveBeenCalledWith({
          detailName: caseData.id,
          tabId: CASE_VIEW_PAGE_TABS.ACTIVITY,
        });
      });
    });

    it('navigates to the alerts tab when the alerts tab is clicked', async () => {
      const navigateToCaseViewMock = useCaseViewNavigationMock().navigateToCaseView;
      appMockRenderer.render(<CaseViewPage {...caseProps} />);

      userEvent.click(await screen.findByTestId('case-view-tab-title-alerts'));

      await waitFor(async () => {
        expect(navigateToCaseViewMock).toHaveBeenCalledWith({
          detailName: caseData.id,
          tabId: CASE_VIEW_PAGE_TABS.ALERTS,
        });
      });
    });

    it('should display the alerts tab when the feature is enabled', async () => {
      appMockRenderer = createAppMockRenderer({ features: { alerts: { enabled: true } } });
      appMockRenderer.render(<CaseViewPage {...caseProps} />);

      expect(await screen.findByTestId('case-view-tab-title-activity')).toBeInTheDocument();
      expect(await screen.findByTestId('case-view-tab-title-alerts')).toBeInTheDocument();
    });

    it('should not display the alerts tab when the feature is disabled', async () => {
      appMockRenderer = createAppMockRenderer({ features: { alerts: { enabled: false } } });
      appMockRenderer.render(<CaseViewPage {...caseProps} />);

      expect(await screen.findByTestId('case-view-tab-title-activity')).toBeInTheDocument();
      expect(screen.queryByTestId('case-view-tab-title-alerts')).not.toBeInTheDocument();
    });

    it('should not show the experimental badge on the alerts table', async () => {
      appMockRenderer = createAppMockRenderer({
        features: { alerts: { isExperimental: false } },
      });
      appMockRenderer.render(<CaseViewPage {...caseProps} />);

      expect(
        screen.queryByTestId('case-view-alerts-table-experimental-badge')
      ).not.toBeInTheDocument();
    });

    it('should show the experimental badge on the alerts table', async () => {
      appMockRenderer = createAppMockRenderer({ features: { alerts: { isExperimental: true } } });
      appMockRenderer.render(<CaseViewPage {...caseProps} />);

      expect(
        await screen.findByTestId('case-view-alerts-table-experimental-badge')
      ).toBeInTheDocument();
    });

    describe('description', () => {
      it('renders the description correctly', async () => {
        appMockRenderer.render(<CaseViewPage {...caseProps} />);

        const description = within(await screen.findByTestId('description'));

        expect(await description.findByText(caseData.description)).toBeInTheDocument();
      });

      it('should display description when case is loading', async () => {
        useUpdateCaseMock.mockImplementation(() => ({
          ...defaultUpdateCaseState,
          isLoading: true,
          updateKey: 'description',
        }));

        appMockRenderer.render(<CaseViewPage {...caseProps} />);

        expect(await screen.findByTestId('description')).toBeInTheDocument();
      });
    });
  });
});
