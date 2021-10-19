/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../../common/mock/endpoint';
import { getPolicyDetailsArtifactsListPath } from '../../../../../common/routing';
import { PolicyTrustedAppsList, PolicyTrustedAppsListProps } from './policy_trusted_apps_list';
import React from 'react';
import { policyDetailsPageAllApiHttpMocks } from '../../../test_utils';
import {
  createLoadingResourceState,
  createUninitialisedResourceState,
  isFailedResourceState,
  isLoadedResourceState,
} from '../../../../../state';
import { fireEvent, within, act, waitFor } from '@testing-library/react';
import { APP_ID } from '../../../../../../../common/constants';
import {
  EndpointPrivileges,
  useEndpointPrivileges,
} from '../../../../../../common/components/user_privileges/endpoint/use_endpoint_privileges';
import { getEndpointPrivilegesInitialStateMock } from '../../../../../../common/components/user_privileges/endpoint/mocks';

jest.mock('../../../../../../common/components/user_privileges/endpoint/use_endpoint_privileges');
const mockUseEndpointPrivileges = useEndpointPrivileges as jest.Mock;

describe('when rendering the PolicyTrustedAppsList', () => {
  // The index (zero based) of the card created by the generator that is policy specific
  const POLICY_SPECIFIC_CARD_INDEX = 2;

  let appTestContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let render: (waitForLoadedState?: boolean) => Promise<ReturnType<AppContextTestRender['render']>>;
  let mockedApis: ReturnType<typeof policyDetailsPageAllApiHttpMocks>;
  let waitForAction: AppContextTestRender['middlewareSpy']['waitForAction'];
  let componentRenderProps: PolicyTrustedAppsListProps;

  const loadedUserEndpointPrivilegesState = (
    endpointOverrides: Partial<EndpointPrivileges> = {}
  ): EndpointPrivileges => ({
    ...getEndpointPrivilegesInitialStateMock(),
    ...endpointOverrides,
  });

  const getCardByIndexPosition = (cardIndex: number = 0) => {
    const card = renderResult.getAllByTestId('policyTrustedAppsGrid-card')[cardIndex];

    if (!card) {
      throw new Error(`Card at index [${cardIndex}] not found`);
    }

    return card;
  };

  const toggleCardExpandCollapse = (cardIndex: number = 0) => {
    act(() => {
      fireEvent.click(
        within(getCardByIndexPosition(cardIndex)).getByTestId(
          'policyTrustedAppsGrid-card-header-expandCollapse'
        )
      );
    });
  };

  const toggleCardActionMenu = async (cardIndex: number = 0) => {
    act(() => {
      fireEvent.click(
        within(getCardByIndexPosition(cardIndex)).getByTestId(
          'policyTrustedAppsGrid-card-header-actions-button'
        )
      );
    });

    await waitFor(() =>
      expect(renderResult.getByTestId('policyTrustedAppsGrid-card-header-actions-contextMenuPanel'))
    );
  };

  afterAll(() => {
    mockUseEndpointPrivileges.mockReset();
  });
  beforeEach(() => {
    appTestContext = createAppRootMockRenderer();
    mockUseEndpointPrivileges.mockReturnValue(loadedUserEndpointPrivilegesState());

    mockedApis = policyDetailsPageAllApiHttpMocks(appTestContext.coreStart.http);
    appTestContext.setExperimentalFlag({ trustedAppsByPolicyEnabled: true });
    waitForAction = appTestContext.middlewareSpy.waitForAction;
    componentRenderProps = {};

    render = async (waitForLoadedState: boolean = true) => {
      appTestContext.history.push(
        getPolicyDetailsArtifactsListPath('ddf6570b-9175-4a6d-b288-61a09771c647')
      );
      const trustedAppDataReceived = waitForLoadedState
        ? waitForAction('assignedTrustedAppsListStateChanged', {
            validate({ payload }) {
              return isLoadedResourceState(payload);
            },
          })
        : Promise.resolve();

      renderResult = appTestContext.render(<PolicyTrustedAppsList {...componentRenderProps} />);
      await trustedAppDataReceived;

      return renderResult;
    };
  });

  it('should show loading spinner if checking to see if trusted apps exist', async () => {
    await render();
    act(() => {
      appTestContext.store.dispatch({
        type: 'policyArtifactsDeosAnyTrustedAppExists',
        // Ignore will be fixed with when AsyncResourceState is refactored (#830)
        // @ts-ignore
        payload: createLoadingResourceState({ previousState: createUninitialisedResourceState() }),
      });
    });

    expect(renderResult.getByTestId('policyTrustedAppsGrid-loading')).not.toBeNull();
  });

  it('should show total number of of items being displayed', async () => {
    await render();

    expect(renderResult.getByTestId('policyDetailsTrustedAppsCount').textContent).toBe(
      'Showing 20 trusted applications'
    );
  });

  it('should NOT show total number if `hideTotalShowingLabel` prop is true', async () => {
    componentRenderProps.hideTotalShowingLabel = true;
    await render();

    expect(renderResult.queryByTestId('policyDetailsTrustedAppsCount')).toBeNull();
  });

  it('should show card grid', async () => {
    await render();

    expect(renderResult.getByTestId('policyTrustedAppsGrid')).toBeTruthy();
    await expect(renderResult.findAllByTestId('policyTrustedAppsGrid-card')).resolves.toHaveLength(
      10
    );
  });

  it('should expand cards', async () => {
    await render();
    // expand
    toggleCardExpandCollapse();
    toggleCardExpandCollapse(4);

    await waitFor(() =>
      expect(
        renderResult.queryAllByTestId('policyTrustedAppsGrid-card-criteriaConditions')
      ).toHaveLength(2)
    );
  });

  it('should collapse cards', async () => {
    await render();

    // expand
    toggleCardExpandCollapse();
    toggleCardExpandCollapse(4);

    await waitFor(() =>
      expect(
        renderResult.queryAllByTestId('policyTrustedAppsGrid-card-criteriaConditions')
      ).toHaveLength(2)
    );

    // collapse
    toggleCardExpandCollapse();
    toggleCardExpandCollapse(4);

    await waitFor(() =>
      expect(
        renderResult.queryAllByTestId('policyTrustedAppsGrid-card-criteriaConditions')
      ).toHaveLength(0)
    );
  });

  it('should show action menu on card', async () => {
    await render();
    expect(
      renderResult.getAllByTestId('policyTrustedAppsGrid-card-header-actions-button')
    ).toHaveLength(10);
  });

  it('should navigate to trusted apps page when view full details action is clicked', async () => {
    await render();
    await toggleCardActionMenu();
    act(() => {
      fireEvent.click(renderResult.getByTestId('policyTrustedAppsGrid-viewFullDetailsAction'));
    });

    expect(appTestContext.coreStart.application.navigateToApp).toHaveBeenCalledWith(
      APP_ID,
      expect.objectContaining({
        path: '/administration/trusted_apps?filter=89f72d8a-05b5-4350-8cad-0dc3661d6e67',
      })
    );
  });

  it('should show dialog when remove action is clicked', async () => {
    await render();
    await toggleCardActionMenu(POLICY_SPECIFIC_CARD_INDEX);
    act(() => {
      fireEvent.click(renderResult.getByTestId('policyTrustedAppsGrid-removeAction'));
    });

    await waitFor(() => expect(renderResult.getByTestId('confirmModalBodyText')));
  });

  describe('and artifact is policy specific', () => {
    const renderAndClickOnEffectScopePopupButton = async () => {
      const retrieveAllPolicies = waitForAction('policyDetailsListOfAllPoliciesStateChanged', {
        validate({ payload }) {
          return isLoadedResourceState(payload);
        },
      });
      await render();
      await retrieveAllPolicies;
      act(() => {
        fireEvent.click(
          within(getCardByIndexPosition(POLICY_SPECIFIC_CARD_INDEX)).getByTestId(
            'policyTrustedAppsGrid-card-header-effectScope-popupMenu-button'
          )
        );
      });
      await waitFor(() =>
        expect(
          renderResult.getByTestId(
            'policyTrustedAppsGrid-card-header-effectScope-popupMenu-popoverPanel'
          )
        )
      );
    };

    it('should display policy names on assignment context menu', async () => {
      await renderAndClickOnEffectScopePopupButton();

      expect(
        renderResult.getByTestId('policyTrustedAppsGrid-card-header-effectScope-popupMenu-item-0')
          .textContent
      ).toEqual('Endpoint Policy 0View details');
      expect(
        renderResult.getByTestId('policyTrustedAppsGrid-card-header-effectScope-popupMenu-item-1')
          .textContent
      ).toEqual('Endpoint Policy 1View details');
    });

    it('should navigate to policy details when clicking policy on assignment context menu', async () => {
      await renderAndClickOnEffectScopePopupButton();

      act(() => {
        fireEvent.click(
          renderResult.getByTestId('policyTrustedAppsGrid-card-header-effectScope-popupMenu-item-0')
        );
      });

      expect(appTestContext.history.location.pathname).toEqual(
        '/administration/policy/ddf6570b-9175-4a6d-b288-61a09771c647/settings'
      );
    });
  });

  it('should handle pagination changes', async () => {
    await render();

    expect(appTestContext.history.location.search).not.toBeTruthy();

    act(() => {
      fireEvent.click(renderResult.getByTestId('pagination-button-next'));
    });

    expect(appTestContext.history.location.search).toMatch('?page_index=1');
  });

  it('should reset `pageIndex` when a new pageSize is selected', async () => {
    await render();
    // page ahead
    act(() => {
      fireEvent.click(renderResult.getByTestId('pagination-button-next'));
    });
    await waitFor(() => {
      expect(appTestContext.history.location.search).toBeTruthy();
    });

    // now change the page size
    await act(async () => {
      fireEvent.click(renderResult.getByTestId('tablePaginationPopoverButton'));
      await waitFor(() => expect(renderResult.getByTestId('tablePagination-50-rows')));
    });
    act(() => {
      fireEvent.click(renderResult.getByTestId('tablePagination-50-rows'));
    });

    expect(appTestContext.history.location.search).toMatch('?page_size=50');
  });

  it('should show toast message if trusted app list api call fails', async () => {
    const error = new Error('oh no');
    // @ts-expect-error
    mockedApis.responseProvider.trustedAppsList.mockRejectedValue(error);
    await render(false);
    await act(async () => {
      await waitForAction('assignedTrustedAppsListStateChanged', {
        validate: ({ payload }) => isFailedResourceState(payload),
      });
    });

    expect(appTestContext.startServices.notifications.toasts.addError).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        title: expect.any(String),
      })
    );
  });

  it('does not show remove option in actions menu if license is downgraded to gold or below', async () => {
    await render();
    mockUseEndpointPrivileges.mockReturnValue(
      loadedUserEndpointPrivilegesState({
        isPlatinumPlus: false,
      })
    );
    await toggleCardActionMenu(POLICY_SPECIFIC_CARD_INDEX);

    expect(renderResult.queryByTestId('policyTrustedAppsGrid-removeAction')).toBeNull();
  });
});
