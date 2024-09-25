/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { useKibana } from '../../../../../../common/lib/kibana';
import { ActionsMenu } from './actions_menu';
import React from 'react';
import { act } from '@testing-library/react';
import { endpointPageHttpMock } from '../../../mocks';
import { licenseService } from '../../../../../../common/hooks/use_license';
import { useUserPrivileges } from '../../../../../../common/components/user_privileges';
import { initialUserPrivilegesState } from '../../../../../../common/components/user_privileges/user_privileges_context';
import { getUserPrivilegesMockDefaultValue } from '../../../../../../common/components/user_privileges/__mocks__';
import type { HostInfo } from '../../../../../../../common/endpoint/types';
import userEvent, { type UserEvent } from '@testing-library/user-event';

jest.mock('../../../../../../common/lib/kibana/kibana_react', () => {
  const originalModule = jest.requireActual('../../../../../../common/lib/kibana/kibana_react');
  return {
    ...originalModule,
    useKibana: jest.fn().mockReturnValue({
      services: {
        application: {
          getUrlForApp: (appId: string, options?: { path?: string }) =>
            `/app/${appId}${options?.path}`,
          navigateToApp: jest.fn(),
        },
      },
    }),
  };
});
jest.mock('../../../../../../common/hooks/use_license');
jest.mock('../../../../../../common/components/user_privileges');

describe('When using the Endpoint Details Actions Menu', () => {
  let user: UserEvent;
  let render: () => Promise<ReturnType<AppContextTestRender['render']>>;
  let coreStart: AppContextTestRender['coreStart'];
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let httpMocks: ReturnType<typeof endpointPageHttpMock>;
  // TODO middlewareSpy.waitForAction() times out after the upgrade to userEvent v14 https://github.com/elastic/kibana/pull/189949
  // let middlewareSpy: AppContextTestRender['middlewareSpy'];
  let endpointHost: HostInfo;

  const setEndpointMetadataResponse = (isolation: boolean = false) => {
    endpointHost = httpMocks.responseProvider.metadataDetails();
    // Safe to mutate this mocked data
    // @ts-expect-error TS2540
    endpointHost.metadata.Endpoint.state.isolation = isolation;
    // @ts-expect-error TS2540
    endpointHost.metadata.host.os.name = 'Windows';
    // @ts-expect-error TS2540
    endpointHost.metadata.agent.version = '7.14.0';
    httpMocks.responseProvider.metadataDetails.mockReturnValue(endpointHost);
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const mockedContext = createAppRootMockRenderer();

    (useKibana as jest.Mock).mockReturnValue({ services: mockedContext.startServices });
    coreStart = mockedContext.coreStart;
    // TODO middlewareSpy.waitForAction() times out after the upgrade to userEvent v14 https://github.com/elastic/kibana/pull/189949
    // middlewareSpy = mockedContext.middlewareSpy;

    httpMocks = endpointPageHttpMock(mockedContext.coreStart.http);

    (useUserPrivileges as jest.Mock).mockReturnValue(getUserPrivilegesMockDefaultValue());

    act(() => {
      mockedContext.history.push(
        '/administration/endpoints?selected_endpoint=5fe11314-678c-413e-87a2-b4a3461878ee'
      );
    });

    render = async () => {
      renderResult = mockedContext.render(<ActionsMenu hostMetadata={endpointHost?.metadata} />);
      const endpointDetailsActionsButton = renderResult.getByTestId('endpointDetailsActionsButton');
      endpointDetailsActionsButton.style.pointerEvents = 'all';
      await user.click(endpointDetailsActionsButton);

      return renderResult;
    };
  });

  afterEach(() => {
    (useUserPrivileges as jest.Mock).mockClear();
  });

  it('should not show the response actions history link', async () => {
    await render();
    expect(renderResult.queryByTestId('actionsLink')).toBeNull();
  });

  describe('and endpoint host is NOT isolated', () => {
    beforeEach(() => setEndpointMetadataResponse());

    it.each([
      ['Isolate host', 'isolateLink'],
      ['View host details', 'hostLink'],
      ['View agent policy', 'agentPolicyLink'],
      ['View agent details', 'agentDetailsLink'],
      ['Reassign agent policy', 'agentPolicyReassignLink'],
    ])('should display %s action', async (_, dataTestSubj) => {
      await render();
      expect(renderResult.getByTestId(dataTestSubj)).not.toBeNull();
    });

    it.each([
      ['Isolate host', 'isolateLink'],
      ['View host details', 'hostLink'],
      ['View agent policy', 'agentPolicyLink'],
      ['View agent details', 'agentDetailsLink'],
      ['Reassign agent policy', 'agentPolicyReassignLink'],
    ])(
      'should navigate via kibana `navigateToApp()` when %s is clicked',
      async (_, dataTestSubj) => {
        await render();
        // TODO middlewareSpy.waitForAction() times out after the upgrade to userEvent v14 https://github.com/elastic/kibana/pull/189949
        // await act(async () => {
        //   await middlewareSpy.waitForAction('serverReturnedEndpointAgentPolicies');
        // });

        const takeActionMenuItem = renderResult.getByTestId(dataTestSubj);
        takeActionMenuItem.style.pointerEvents = 'all';
        await user.click(takeActionMenuItem);

        expect(coreStart.application.navigateToApp).toHaveBeenCalled();
      }
    );
  });

  describe('and endpoint host is isolated', () => {
    beforeEach(() => setEndpointMetadataResponse(true));

    describe('and user has unisolate privilege', () => {
      it('should display `Release` action', async () => {
        await render();
        expect(renderResult.getByTestId('unIsolateLink')).not.toBeNull();
      });

      it('should navigate via router when `Release` is clicked', async () => {
        await render();
        const isolateButton = renderResult.getByTestId('unIsolateLink');
        isolateButton.style.pointerEvents = 'all';
        await user.click(isolateButton);

        expect(coreStart.application.navigateToApp).toHaveBeenCalled();
      });
    });

    describe('and user does not have unisolate privilege', () => {
      beforeEach(() => {
        (useUserPrivileges as jest.Mock).mockReturnValue({
          ...initialUserPrivilegesState(),
          endpointPrivileges: {
            ...initialUserPrivilegesState().endpointPrivileges,
            canIsolateHost: false,
            canUnIsolateHost: false,
          },
        });
      });

      it('should not display `Release` action', async () => {
        await render();
        expect(renderResult.queryByTestId('unIsolateLink')).toBeNull();
      });
    });
  });

  describe('and license is NOT PlatinumPlus', () => {
    const licenseServiceMock = licenseService as jest.Mocked<typeof licenseService>;

    beforeEach(() => licenseServiceMock.isPlatinumPlus.mockReturnValue(false));

    afterEach(() => licenseServiceMock.isPlatinumPlus.mockReturnValue(true));

    it('should still show `Release` action for endpoints that are currently isolated', async () => {
      setEndpointMetadataResponse(true);
      await render();
      expect(renderResult.queryByTestId('isolateLink')).toBeNull();
      expect(renderResult.getByTestId('unIsolateLink')).not.toBeNull();
    });
  });
});
