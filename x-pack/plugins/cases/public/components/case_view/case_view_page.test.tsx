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
import { useGetActionTypes } from '../../containers/configure/use_action_types';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
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
import { actionTypesMock, getCaseConnectorsMockResponse } from '../../common/mock/connectors';
import { useInfiniteFindCaseUserActions } from '../../containers/use_infinite_find_case_user_actions';
import { useGetCaseUserActionsStats } from '../../containers/use_get_case_user_actions_stats';
import { useCasesFeatures } from '../../common/use_cases_features';
import { CaseMetricsFeature } from '../../../common/types/api';
import { useGetCategories } from '../../containers/use_get_categories';
import { useSuggestUserProfiles } from '../../containers/user_profiles/use_suggest_user_profiles';
import { casesConfigurationsMock } from '../../containers/configure/mock';
import { useGetCurrentUserProfile } from '../../containers/user_profiles/use_get_current_user_profile';
import { userProfiles } from '../../containers/user_profiles/api.mock';
import type { ReturnUsePushToService } from '../use_push_to_service';
import { usePushToService } from '../use_push_to_service';

jest.mock('../../containers/use_get_action_license');
jest.mock('../../containers/use_update_case');
jest.mock('../../containers/use_get_case_metrics');
jest.mock('../../containers/use_find_case_user_actions');
jest.mock('../../containers/use_infinite_find_case_user_actions');
jest.mock('../../containers/use_get_case_user_actions_stats');
jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/use_get_case');
jest.mock('../../containers/configure/use_get_supported_action_connectors');
jest.mock('../../containers/configure/use_action_types');
jest.mock('../../containers/configure/use_get_case_configuration');
jest.mock('../../containers/use_post_push_to_service');
jest.mock('../../containers/use_get_case_connectors');
jest.mock('../../containers/use_get_case_users');
jest.mock('../../containers/user_profiles/use_bulk_get_user_profiles');
jest.mock('../../containers/user_profiles/use_suggest_user_profiles');
jest.mock('../../common/use_cases_features');
jest.mock('../user_actions/timestamp', () => ({
  UserActionTimestamp: () => <></>,
}));
jest.mock('../../common/navigation/hooks');
jest.mock('../../common/hooks');
jest.mock('../connectors/resilient/api');
jest.mock('../../common/lib/kibana');
jest.mock('../../containers/use_get_categories');
jest.mock('../../containers/user_profiles/use_get_current_user_profile');
jest.mock('../use_push_to_service');

const useFetchCaseMock = useGetCase as jest.Mock;
const useUrlParamsMock = useUrlParams as jest.Mock;
const useCaseViewNavigationMock = useCaseViewNavigation as jest.Mock;
const useUpdateCaseMock = useUpdateCase as jest.Mock;
const useFindCaseUserActionsMock = useFindCaseUserActions as jest.Mock;
const useInfiniteFindCaseUserActionsMock = useInfiniteFindCaseUserActions as jest.Mock;
const useGetCaseUserActionsStatsMock = useGetCaseUserActionsStats as jest.Mock;
const useGetConnectorsMock = useGetSupportedActionConnectors as jest.Mock;
const useGetActionTypesMock = useGetActionTypes as jest.Mock;
const useGetCaseConfigurationMock = useGetCaseConfiguration as jest.Mock;
const usePostPushToServiceMock = usePostPushToService as jest.Mock;
const useGetCaseConnectorsMock = useGetCaseConnectors as jest.Mock;
const useGetCaseMetricsMock = useGetCaseMetrics as jest.Mock;
const useGetTagsMock = useGetTags as jest.Mock;
const useGetCaseUsersMock = useGetCaseUsers as jest.Mock;
const useCasesFeaturesMock = useCasesFeatures as jest.Mock;
const useGetCategoriesMock = useGetCategories as jest.Mock;
const useSuggestUserProfilesMock = useSuggestUserProfiles as jest.Mock;
const useGetCurrentUserProfileMock = useGetCurrentUserProfile as jest.Mock;
const usePushToServiceMock = usePushToService as jest.Mock;

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

const usePushToServiceMockRes: ReturnUsePushToService = {
  errorsMsg: [],
  hasErrorMessages: false,
  needsToBePushed: true,
  hasBeenPushed: true,
  isLoading: false,
  hasLicenseError: false,
  hasPushPermissions: true,
  handlePushToService: jest.fn(),
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

    jest.useFakeTimers();
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
    useGetActionTypesMock.mockReturnValue({ data: actionTypesMock, isLoading: false });
    useGetCaseConfigurationMock.mockReturnValue({
      data: casesConfigurationsMock,
      isLoading: false,
    });
    useGetTagsMock.mockReturnValue({ data: [], isLoading: false });
    useGetCaseUsersMock.mockReturnValue({ isLoading: false, data: caseUsers });
    useCasesFeaturesMock.mockReturnValue({
      metricsFeatures: [CaseMetricsFeature.ALERTS_COUNT],
      pushToServiceAuthorized: true,
      caseAssignmentAuthorized: true,
      isAlertsEnabled: true,
      isSyncAlertsEnabled: true,
    });
    useGetCategoriesMock.mockReturnValue({ data: [], isLoading: false });
    useSuggestUserProfilesMock.mockReturnValue({ data: [], isLoading: false });
    useUrlParamsMock.mockReturnValue({});
    useGetCurrentUserProfileMock.mockReturnValue({ isLoading: false, data: userProfiles[0] });
    usePushToServiceMock.mockReturnValue(usePushToServiceMockRes);

    appMockRenderer = createAppMockRenderer({ license: platinumLicense });
  });

  afterAll(() => {
    Object.defineProperty(window, 'getComputedStyle', originalGetComputedStyle);
    jest.useRealTimers();
  });

  for (let index = 0; index < 1; index++) {
    it('shows the metrics section', async () => {
      appMockRenderer.render(<CaseViewPage {...caseProps} />);

      expect(await screen.findByTestId('case-view-metrics-panel')).toBeInTheDocument();
    });

    it('shows the case action bar', async () => {
      appMockRenderer.render(<CaseViewPage {...caseProps} />);

      expect(await screen.findByTestId('case-action-bar-wrapper')).toBeInTheDocument();
    });

    it('shows the connectors in the sidebar', async () => {
      appMockRenderer.render(<CaseViewPage {...caseProps} />);

      expect(await screen.findByTestId('sidebar-connectors')).toBeInTheDocument();
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

      userEvent.click(
        (await screen.findAllByTestId('comment-action-show-alert-alert-action-id'))[1]
      );

      await waitFor(() => {
        expect(showAlertDetails).toHaveBeenCalledWith('alert-id-1', 'alert-index-1');
      });
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

    describe('Tabs', () => {
      it('should show the case tabs', async () => {
        appMockRenderer.render(<CaseViewPage {...caseProps} />);

        expect(await screen.findByTestId('case-view-tabs')).toBeInTheDocument();
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
  }
});
