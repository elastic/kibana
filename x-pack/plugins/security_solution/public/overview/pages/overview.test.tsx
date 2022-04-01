/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { merge } from 'lodash';

import '../../common/mock/match_media';
import { TestProviders } from '../../common/mock';
import {
  useMessagesStorage,
  UseMessagesStorage,
} from '../../common/containers/local_storage/use_messages_storage';
import { Overview } from './index';
import { useUserPrivileges } from '../../common/components/user_privileges';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import { useFetchIndex } from '../../common/containers/source';
import { useAllTiDataSources } from '../containers/overview_cti_links/use_all_ti_data_sources';
import { mockCtiLinksResponse, mockTiDataSources } from '../components/overview_cti_links/mock';
import { useCtiDashboardLinks } from '../containers/overview_cti_links';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { initialUserPrivilegesState } from '../../common/components/user_privileges/user_privileges_context';
import { EndpointPrivileges } from '../../../common/endpoint/types';
import { useHostRiskScore } from '../../risk_score/containers';
import { APP_UI_ID, SecurityPageName } from '../../../common/constants';
import { getAppLandingUrl } from '../../common/components/link_to/redirect_to_landing';
import { mockCasesContract } from '../../../../cases/public/mocks';

const mockNavigateToApp = jest.fn();
jest.mock('../../common/lib/kibana', () => {
  const original = jest.requireActual('../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      services: {
        ...original.useKibana().services,
        application: {
          ...original.useKibana().services.application,
          navigateToApp: mockNavigateToApp,
        },
        cases: {
          ...mockCasesContract(),
        },
      },
    }),
  };
});
jest.mock('../../common/containers/source');
jest.mock('../../common/containers/sourcerer');
jest.mock('../../common/containers/use_global_time', () => ({
  useGlobalTime: jest.fn().mockReturnValue({
    from: '2020-07-07T08:20:18.966Z',
    isInitializing: false,
    to: '2020-07-08T08:20:18.966Z',
    setQuery: jest.fn(),
  }),
}));

// Test will fail because we will to need to mock some core services to make the test work
// For now let's forget about SiemSearchBar and QueryBar
jest.mock('../../common/components/search_bar', () => ({
  SiemSearchBar: () => null,
}));
jest.mock('../../common/components/query_bar', () => ({
  QueryBar: () => null,
}));
jest.mock('../../common/components/user_privileges', () => {
  return {
    ...jest.requireActual('../../common/components/user_privileges'),
    useUserPrivileges: jest.fn(() => {
      return {
        listPrivileges: { loading: false, error: undefined, result: undefined },
        detectionEnginePrivileges: { loading: false, error: undefined, result: undefined },
        endpointPrivileges: {
          loading: false,
          canAccessEndpointManagement: true,
          canAccessFleet: true,
        },
      };
    }),
  };
});
jest.mock('../../common/containers/local_storage/use_messages_storage');

jest.mock('../containers/overview_cti_links');

jest.mock('../../common/components/visualization_actions', () => ({
  VisualizationActions: jest.fn(() => <div data-test-subj="mock-viz-actions" />),
}));

const useCtiDashboardLinksMock = useCtiDashboardLinks as jest.Mock;
useCtiDashboardLinksMock.mockReturnValue(mockCtiLinksResponse);

jest.mock('../containers/overview_cti_links/use_all_ti_data_sources');
const useAllTiDataSourcesMock = useAllTiDataSources as jest.Mock;
useAllTiDataSourcesMock.mockReturnValue(mockTiDataSources);

jest.mock('../../risk_score/containers');
const useHostRiskScoreMock = useHostRiskScore as jest.Mock;
useHostRiskScoreMock.mockReturnValue([false, { data: [], isModuleEnabled: false }]);

jest.mock('../../common/hooks/use_experimental_features');
const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as jest.Mock;
useIsExperimentalFeatureEnabledMock.mockReturnValue(true);

const endpointNoticeMessage = (hasMessageValue: boolean) => {
  return {
    hasMessage: () => hasMessageValue,
    getMessages: () => [],
    addMessage: () => undefined,
    removeMessage: () => undefined,
    clearAllMessages: () => undefined,
  };
};
const mockUseSourcererDataView = useSourcererDataView as jest.Mock;
const mockUseUserPrivileges = useUserPrivileges as jest.Mock;
const mockUseFetchIndex = useFetchIndex as jest.Mock;
const mockUseMessagesStorage: jest.Mock = useMessagesStorage as jest.Mock<UseMessagesStorage>;

describe('Overview', () => {
  const loadedUserPrivilegesState = (
    endpointOverrides: Partial<EndpointPrivileges> = {}
  ): ReturnType<typeof initialUserPrivilegesState> =>
    merge(initialUserPrivilegesState(), {
      endpointPrivileges: {
        loading: false,
        canAccessFleet: true,
        canAccessEndpointManagement: true,
        ...endpointOverrides,
      },
    });

  beforeEach(() => {
    mockUseUserPrivileges.mockReturnValue(loadedUserPrivilegesState());
    mockUseFetchIndex.mockReturnValue([
      false,
      {
        indexExists: true,
      },
    ]);
  });

  afterAll(() => {
    mockUseUserPrivileges.mockReset();
  });

  describe('rendering', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    test('it DOES NOT render the Getting started text when an index is available', () => {
      mockUseSourcererDataView.mockReturnValue({
        selectedPatterns: [],
        indicesExist: true,
        indexPattern: {},
      });

      mockUseMessagesStorage.mockImplementation(() => endpointNoticeMessage(false));

      const wrapper = mount(
        <TestProviders>
          <MemoryRouter>
            <Overview />
          </MemoryRouter>
        </TestProviders>
      );

      expect(mockNavigateToApp).not.toHaveBeenCalled();
      wrapper.unmount();
    });

    test('it DOES render the Endpoint banner when the endpoint index is NOT available AND storage is NOT set', () => {
      mockUseFetchIndex.mockReturnValue([
        false,
        {
          indexExists: false,
        },
      ]);
      mockUseSourcererDataView.mockReturnValue({
        selectedPatterns: [],
        indicesExist: true,
        indexPattern: {},
      });

      mockUseMessagesStorage.mockImplementation(() => endpointNoticeMessage(false));

      const wrapper = mount(
        <TestProviders>
          <MemoryRouter>
            <Overview />
          </MemoryRouter>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="endpoint-prompt-banner"]').exists()).toBe(true);
      wrapper.unmount();
    });

    test('it does NOT render the Endpoint banner when the endpoint index is NOT available but storage is set', () => {
      mockUseFetchIndex.mockReturnValue([
        false,
        {
          indexExists: false,
        },
      ]);
      mockUseSourcererDataView.mockReturnValueOnce({
        selectedPatterns: [],
        indicesExist: true,
        indexPattern: {},
      });

      mockUseMessagesStorage.mockImplementation(() => endpointNoticeMessage(true));

      const wrapper = mount(
        <TestProviders>
          <MemoryRouter>
            <Overview />
          </MemoryRouter>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="endpoint-prompt-banner"]').exists()).toBe(false);
      wrapper.unmount();
    });

    test('it does NOT render the Endpoint banner when the endpoint index is available AND storage is set', () => {
      mockUseSourcererDataView.mockReturnValue({
        selectedPatterns: [],
        indexExists: true,
        indexPattern: {},
      });

      mockUseMessagesStorage.mockImplementation(() => endpointNoticeMessage(true));

      const wrapper = mount(
        <TestProviders>
          <MemoryRouter>
            <Overview />
          </MemoryRouter>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="endpoint-prompt-banner"]').exists()).toBe(false);
      wrapper.unmount();
    });

    test('it does NOT render the Endpoint banner when an index IS available but storage is NOT set', () => {
      mockUseSourcererDataView.mockReturnValue({
        selectedPatterns: [],
        indicesExist: true,
        indexPattern: {},
      });

      mockUseMessagesStorage.mockImplementation(() => endpointNoticeMessage(false));

      const wrapper = mount(
        <TestProviders>
          <MemoryRouter>
            <Overview />
          </MemoryRouter>
        </TestProviders>
      );
      wrapper.update();
      expect(wrapper.find('[data-test-subj="endpoint-prompt-banner"]').exists()).toBe(false);
      wrapper.unmount();
    });

    test('it does NOT render the Endpoint banner when Ingest is NOT available', () => {
      mockUseSourcererDataView.mockReturnValue({
        selectedPatterns: [],
        indicesExist: true,
        indexPattern: {},
      });

      mockUseMessagesStorage.mockImplementation(() => endpointNoticeMessage(true));
      mockUseUserPrivileges.mockReturnValue(loadedUserPrivilegesState({ canAccessFleet: false }));

      const wrapper = mount(
        <TestProviders>
          <MemoryRouter>
            <Overview />
          </MemoryRouter>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="endpoint-prompt-banner"]').exists()).toBe(false);
      wrapper.unmount();
    });

    describe('when no index is available', () => {
      beforeEach(() => {
        mockUseSourcererDataView.mockReturnValue({
          selectedPatterns: [],
          indicesExist: false,
        });
        mockUseUserPrivileges.mockReturnValue(loadedUserPrivilegesState({ canAccessFleet: false }));
        mockUseMessagesStorage.mockImplementation(() => endpointNoticeMessage(false));
      });

      it('renders the Setup Instructions text', () => {
        mount(
          <TestProviders>
            <MemoryRouter>
              <Overview />
            </MemoryRouter>
          </TestProviders>
        );
        const getUrlForAppMock = (
          appId: string,
          options?: { deepLinkId?: string; path?: string; absolute?: boolean }
        ) => `${appId}${options?.deepLinkId ? `/${options.deepLinkId}` : ''}${options?.path ?? ''}`;

        const landingPath = getUrlForAppMock(APP_UI_ID, { deepLinkId: SecurityPageName.landing });

        expect(mockNavigateToApp).toHaveBeenCalledWith(APP_UI_ID, {
          deepLinkId: SecurityPageName.landing,
          path: getAppLandingUrl(landingPath),
        });
      });
    });
  });

  describe('Threat Intel Dashboard Links', () => {
    it('invokes useAllTiDataSourcesMock hook only once', () => {
      useAllTiDataSourcesMock.mockClear();
      mount(
        <TestProviders>
          <MemoryRouter>
            <Overview />
          </MemoryRouter>
        </TestProviders>
      );
      expect(useAllTiDataSourcesMock).toHaveBeenCalledTimes(1);
    });
  });
});
