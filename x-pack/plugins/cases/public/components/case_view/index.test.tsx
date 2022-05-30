/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { act, waitFor } from '@testing-library/react';

import '../../common/mock/match_media';
import { CaseView } from '.';
import { CaseViewProps } from './types';
import {
  basicCase,
  caseUserActions,
  alertComment,
  getAlertUserAction,
  basicCaseMetrics,
  connectorsMock,
} from '../../containers/mock';
import { TestProviders } from '../../common/mock';
import { SpacesApi } from '@kbn/spaces-plugin/public';
import { useUpdateCase } from '../../containers/use_update_case';
import { UseGetCase, useGetCase } from '../../containers/use_get_case';
import { useGetCaseMetrics } from '../../containers/use_get_case_metrics';

import { useConnectors } from '../../containers/configure/use_connectors';
import { usePostPushToService } from '../../containers/use_post_push_to_service';
import { ConnectorTypes } from '../../../common/api';
import { Case } from '../../../common/ui';
import { useKibana } from '../../common/lib/kibana';
import { useGetCaseUserActions } from '../../containers/use_get_case_user_actions';
import { QueryClient, QueryClientProvider } from 'react-query';
import { CASE_VIEW_CACHE_KEY } from '../../containers/constants';

jest.mock('../../containers/use_update_case');
jest.mock('../../containers/use_get_case_user_actions');
jest.mock('../../containers/use_get_case');
jest.mock('../../containers/use_get_case_metrics');
jest.mock('../../containers/configure/use_connectors');
jest.mock('../../containers/use_post_push_to_service');
jest.mock('../user_actions/timestamp', () => ({
  UserActionTimestamp: () => <></>,
}));
jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');
jest.mock('../../containers/api');

const useFetchCaseMock = useGetCase as jest.Mock;
const useGetCaseMetricsMock = useGetCaseMetrics as jest.Mock;
const useUpdateCaseMock = useUpdateCase as jest.Mock;
const useGetCaseUserActionsMock = useGetCaseUserActions as jest.Mock;
const useConnectorsMock = useConnectors as jest.Mock;
const usePostPushToServiceMock = usePostPushToService as jest.Mock;
const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const spacesUiApiMock = {
  redirectLegacyUrl: jest.fn().mockResolvedValue(undefined),
  components: {
    getLegacyUrlConflict: jest.fn().mockReturnValue(<div data-test-subj="conflict-component" />),
  },
};

const alertsHit = [
  {
    _id: 'alert-id-1',
    _index: 'alert-index-1',
    _source: {
      signal: {
        rule: {
          id: 'rule-id-1',
          name: 'Awesome rule',
        },
      },
    },
  },
  {
    _id: 'alert-id-2',
    _index: 'alert-index-2',
    _source: {
      signal: {
        rule: {
          id: 'rule-id-2',
          name: 'Awesome rule 2',
        },
      },
    },
  },
];

export const caseViewProps: CaseViewProps = {
  onComponentInitialized: jest.fn(),
  actionsNavigation: {
    href: jest.fn(),
    onClick: jest.fn(),
  },
  ruleDetailsNavigation: {
    href: jest.fn(),
    onClick: jest.fn(),
  },
  showAlertDetails: jest.fn(),
  useFetchAlertData: () => [
    false,
    {
      'alert-id-1': alertsHit[0],
      'alert-id-2': alertsHit[1],
    },
  ],
};

export const caseData: Case = {
  ...basicCase,
  comments: [...basicCase.comments, alertComment],
  connector: {
    id: 'resilient-2',
    name: 'Resilient',
    type: ConnectorTypes.resilient,
    fields: null,
  },
};

describe('CaseView', () => {
  const updateCaseProperty = jest.fn();
  const fetchCaseUserActions = jest.fn();
  const refetchCase = jest.fn();
  const fetchCaseMetrics = jest.fn();
  const pushCaseToExternalService = jest.fn();

  const defaultGetCase = {
    isLoading: false,
    isError: false,
    data: {
      case: caseData,
      outcome: 'exactMatch',
    },
    refetch: refetchCase,
  };

  const defaultGetCaseMetrics = {
    isLoading: false,
    isError: false,
    data: {
      metrics: basicCaseMetrics,
    },
    refetch: fetchCaseMetrics,
  };

  const defaultUpdateCaseState = {
    isLoading: false,
    isError: false,
    updateKey: null,
    updateCaseProperty,
  };

  const defaultUseGetCaseUserActions = {
    data: {
      caseUserActions: [...caseUserActions, getAlertUserAction()],
      caseServices: {},
      hasDataToPush: false,
      participants: [caseData.createdBy],
    },
    refetch: fetchCaseUserActions,
    isLoading: false,
    isFetching: false,
    isError: false,
  };

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

  beforeAll(() => {
    mockGetCase();
    useGetCaseMetricsMock.mockReturnValue(defaultGetCaseMetrics);
    useUpdateCaseMock.mockReturnValue(defaultUpdateCaseState);
    useGetCaseUserActionsMock.mockReturnValue(defaultUseGetCaseUserActions);
    usePostPushToServiceMock.mockReturnValue({ isLoading: false, pushCaseToExternalService });
    useConnectorsMock.mockReturnValue({ connectors: connectorsMock, loading: false });
    useKibanaMock().services.spaces = { ui: spacesUiApiMock } as unknown as SpacesApi;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null if error', async () => {
    mockGetCase({ isError: true });
    const wrapper = mount(
      <TestProviders>
        <CaseView {...caseViewProps} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(wrapper).toEqual({});
    });
  });

  it('should return spinner if loading', async () => {
    mockGetCase({ isLoading: true });
    const wrapper = mount(
      <TestProviders>
        <CaseView {...caseViewProps} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="case-view-loading"]').exists()).toBeTruthy();
    });
  });

  it('should return case view when data is there', async () => {
    mockGetCase({ data: { ...defaultGetCase.data, outcome: 'exactMatch' } });
    const wrapper = mount(
      <TestProviders>
        <CaseView {...caseViewProps} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="case-view-title"]').exists()).toBeTruthy();
      expect(spacesUiApiMock.components.getLegacyUrlConflict).not.toHaveBeenCalled();
      expect(spacesUiApiMock.redirectLegacyUrl).not.toHaveBeenCalled();
    });
  });

  it('should redirect case view when resolves to alias match', async () => {
    const resolveAliasId = `${defaultGetCase.data.case.id}_2`;
    const resolveAliasPurpose = 'savedObjectConversion' as const;
    mockGetCase({
      data: {
        ...defaultGetCase.data,
        outcome: 'aliasMatch',
        aliasTargetId: resolveAliasId,
        aliasPurpose: resolveAliasPurpose,
      },
    });
    const wrapper = mount(
      <TestProviders>
        <CaseView {...caseViewProps} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="case-view-title"]').exists()).toBeTruthy();
      expect(spacesUiApiMock.components.getLegacyUrlConflict).not.toHaveBeenCalled();
      expect(spacesUiApiMock.redirectLegacyUrl).toHaveBeenCalledWith({
        path: `/cases/${resolveAliasId}`,
        aliasPurpose: resolveAliasPurpose,
        objectNoun: 'case',
      });
    });
  });

  it('should redirect case view when resolves to conflict', async () => {
    const resolveAliasId = `${defaultGetCase.data.case.id}_2`;
    mockGetCase({
      data: { ...defaultGetCase.data, outcome: 'conflict', aliasTargetId: resolveAliasId },
    });
    const wrapper = mount(
      <TestProviders>
        <CaseView {...caseViewProps} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="case-view-title"]').exists()).toBeTruthy();
      expect(wrapper.find('[data-test-subj="conflict-component"]').exists()).toBeTruthy();
      expect(spacesUiApiMock.redirectLegacyUrl).not.toHaveBeenCalled();
      expect(spacesUiApiMock.components.getLegacyUrlConflict).toHaveBeenCalledWith({
        objectNoun: 'case',
        currentObjectId: defaultGetCase.data.case.id,
        otherObjectId: resolveAliasId,
        otherObjectPath: `/cases/${resolveAliasId}`,
      });
    });
  });

  it('should refresh data on refresh', async () => {
    const queryClient = new QueryClient();
    const queryClientSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = mount(
      <TestProviders>
        <QueryClientProvider client={queryClient}>
          <CaseView {...caseViewProps} />
        </QueryClientProvider>
      </TestProviders>
    );
    wrapper.find('[data-test-subj="case-refresh"]').first().simulate('click');
    await waitFor(() => {
      expect(queryClientSpy).toHaveBeenCalledWith('case');
    });
  });

  describe('when a `refreshRef` prop is provided', () => {
    let refreshRef: CaseViewProps['refreshRef'];
    const queryClient = new QueryClient();
    const queryClientSpy = jest.spyOn(queryClient, 'invalidateQueries');

    beforeEach(async () => {
      refreshRef = React.createRef();

      await act(async () => {
        mount(
          <TestProviders>
            <QueryClientProvider client={queryClient}>
              <CaseView
                {...{
                  refreshRef,
                  caseId: '1234',
                  onComponentInitialized: jest.fn(),
                  showAlertDetails: jest.fn(),
                  useFetchAlertData: jest.fn().mockReturnValue([false, alertsHit[0]]),
                  userCanCrud: true,
                }}
              />
            </QueryClientProvider>
          </TestProviders>
        );
      });
    });

    it('should set it with expected refresh interface', async () => {
      expect(refreshRef!.current).toEqual({
        refreshCase: expect.any(Function),
      });
    });

    it('should refresh actions and comments', async () => {
      refreshRef!.current!.refreshCase();
      await waitFor(() => {
        expect(queryClientSpy).toHaveBeenCalledWith(CASE_VIEW_CACHE_KEY);
      });
    });
  });
});
