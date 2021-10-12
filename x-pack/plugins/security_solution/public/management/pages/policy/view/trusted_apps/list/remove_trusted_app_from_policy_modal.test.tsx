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
import { isLoadedResourceState } from '../../../../../state';
import React from 'react';
import { fireEvent, act } from '@testing-library/react';
import { policyDetailsPageAllApiHttpMocks } from '../../../test_utils';
import {
  RemoveTrustedAppFromPolicyModal,
  RemoveTrustedAppFromPolicyModalProps,
} from './remove_trusted_app_from_policy_modal';
import { PolicyArtifactsUpdateTrustedApps } from '../../../store/policy_details/action/policy_trusted_apps_action';
import { Immutable } from '../../../../../../../common/endpoint/types';

describe('When using the RemoveTrustedAppFromPolicyModal component', () => {
  let appTestContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let render: (waitForLoadedState?: boolean) => Promise<ReturnType<AppContextTestRender['render']>>;
  let waitForAction: AppContextTestRender['middlewareSpy']['waitForAction'];
  let mockedApis: ReturnType<typeof policyDetailsPageAllApiHttpMocks>;
  let onCloseHandler: jest.MockedFunction<RemoveTrustedAppFromPolicyModalProps['onClose']>;
  let trustedApps: RemoveTrustedAppFromPolicyModalProps['trustedApps'];

  beforeEach(() => {
    appTestContext = createAppRootMockRenderer();
    waitForAction = appTestContext.middlewareSpy.waitForAction;
    onCloseHandler = jest.fn();
    mockedApis = policyDetailsPageAllApiHttpMocks(appTestContext.coreStart.http);
    trustedApps = [mockedApis.responseProvider.policyTrustedAppsList({ query: {} }).data[0]];

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

      renderResult = appTestContext.render(
        <RemoveTrustedAppFromPolicyModal trustedApps={trustedApps} onClose={onCloseHandler} />
      );

      await trustedAppDataReceived;

      return renderResult;
    };
  });

  const getConfirmButton = (): HTMLButtonElement =>
    renderResult.getByTestId('confirmModalConfirmButton') as HTMLButtonElement;

  const clickConfirmButton = async (
    waitForActionDispatch: boolean = false
  ): Promise<Immutable<PolicyArtifactsUpdateTrustedApps> | undefined> => {
    const pendingConfirmStoreAction = waitForAction('policyArtifactsUpdateTrustedApps');

    act(() => {
      fireEvent.click(getConfirmButton());
    });

    let response: PolicyArtifactsUpdateTrustedApps;

    if (waitForActionDispatch) {
      await act(async () => {
        response = await pendingConfirmStoreAction;
      });
    }

    return response;
  };

  const clickCancelButton = () => {
    act(() => {
      fireEvent.click(renderResult.getByTestId('confirmModalCancelButton'));
    });
  };

  const clickCloseButton = () => {
    act(() => {
      fireEvent.click(renderResult.baseElement.querySelector('button.euiModal__closeIcon')!);
    });
  };

  it.each([
    ['cancel', clickCancelButton],
    ['close', clickCloseButton],
  ])('should call `onClose` callback when %s button is clicked', async (__, clickButton) => {
    await render();
    clickButton();

    expect(onCloseHandler).toHaveBeenCalled();
  });

  it('should dispatch action when confirmed', async () => {
    await render();
    const confirmedAction = await clickConfirmButton(true);

    expect(confirmedAction!.payload).toEqual({
      action: 'remove',
      artifacts: trustedApps,
    });
  });

  it('should disable and show loading state on confirm button while update is underway', async () => {
    await render();
    await clickConfirmButton(true);
    const confirmButton = getConfirmButton();

    // FIXME:PT GETTING ERROR: rror: current policy id not found
    //     at removeTrustedAppsFromPolicy (/Users/ptavares/WORKSPACES/kibana/x-pack/plugins/security_solution/public/management/pages/policy/store/policy_details/middleware/policy_trusted_apps_middleware.ts:368:13)
    //     at policyTrustedAppsMiddlewareRunner (/Users/ptavares/WORKSPACES/kibana/x-pack/plugins/security_solution/public/management/pages/policy/store/policy_details/middleware/policy_trusted_apps_middleware.ts:93:9)

    expect(confirmButton.disabled).toBe(true);
    expect(confirmButton.querySelector('.euiLoadingSpinner')).not.toBeNull();
  });

  it.each([
    ['cancel', clickCancelButton],
    ['close', clickCloseButton],
  ])(
    'should prevent dialog dismissal if %s button is clicked while update is underway',
    (__, clickButton) => {}
  );

  it.todo('should show error toast if removal failed');

  it.todo('should show success toast and close modal when removed is successful');

  it.todo('should show single removal success message');

  it.todo('should show multiples removal success message');
});
