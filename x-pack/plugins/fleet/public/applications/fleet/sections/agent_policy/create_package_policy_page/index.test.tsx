/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Route, useLocation } from 'react-router-dom';
import React from 'react';
import { fireEvent, act, waitFor } from '@testing-library/react';

import type { MockedFleetStartServices, TestRenderer } from '../../../../../mock';
import { createFleetTestRendererMock } from '../../../../../mock';
import { FLEET_ROUTING_PATHS, pagePathGetters, PLUGIN_ID } from '../../../constants';
import type { CreatePackagePolicyRouteState } from '../../../types';

import { sendCreatePackagePolicy, sendCreateAgentPolicy, useIntraAppState } from '../../../hooks';

import { CreatePackagePolicyPage } from './index';

jest.mock('../../../hooks', () => {
  return {
    ...jest.requireActual('../../../hooks'),
    useFleetStatus: jest.fn().mockReturnValue({ isReady: true } as any),
    sendGetStatus: jest
      .fn()
      .mockResolvedValue({ data: { isReady: true, missing_requirements: [] } }),
    sendGetAgentStatus: jest.fn().mockResolvedValue({ data: { results: { total: 0 } } }),
    useGetAgentPolicies: jest.fn().mockReturnValue({
      data: {
        items: [{ id: 'agent-policy-1', name: 'Agent policy 1', namespace: 'default' }],
      },
      error: undefined,
      isLoading: false,
      resendRequest: jest.fn(),
    } as any),
    sendGetOneAgentPolicy: jest.fn().mockResolvedValue({
      data: { item: { id: 'agent-policy-1', name: 'Agent policy 1', namespace: 'default' } },
    }),
    useGetPackageInfoByKey: jest.fn().mockReturnValue({
      data: { item: { name: 'nginx', version: '0.3.7', title: 'Nginx' } },
      isLoading: false,
    }),
    sendCreatePackagePolicy: jest
      .fn()
      .mockResolvedValue({ data: { item: { id: 'policy-1', inputs: [] } } }),
    sendCreateAgentPolicy: jest.fn().mockResolvedValue({
      data: { item: { id: 'agent-policy-2', name: 'Agent policy 2', namespace: 'default' } },
    }),
    useIntraAppState: jest.fn().mockReturnValue({}),
  };
});

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn().mockReturnValue({ search: '' }),
}));

describe('when on the package policy create page', () => {
  const createPageUrlPath = pagePathGetters.add_integration_to_policy({ pkgkey: 'nginx-0.3.7' })[1];

  let testRenderer: TestRenderer;
  let renderResult: ReturnType<typeof testRenderer.render>;
  const render = () =>
    (renderResult = testRenderer.render(
      <Route path={FLEET_ROUTING_PATHS.add_integration_to_policy}>
        <CreatePackagePolicyPage />
      </Route>
    ));

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
    mockApiCalls(testRenderer.startServices.http);
    testRenderer.mountHistory.push(createPageUrlPath);
  });

  describe('and Route state is provided via Fleet HashRouter', () => {
    let expectedRouteState: CreatePackagePolicyRouteState;

    beforeEach(() => {
      expectedRouteState = {
        onCancelUrl: 'http://cancel/url/here',
        onCancelNavigateTo: [PLUGIN_ID, { path: '/cancel/url/here' }],
      };

      testRenderer.mountHistory.replace({
        pathname: createPageUrlPath,
        state: expectedRouteState,
      });

      (useIntraAppState as jest.MockedFunction<any>).mockReturnValue(expectedRouteState);
    });

    describe('and the cancel Link or Button is clicked', () => {
      let cancelLink: HTMLAnchorElement;
      let cancelButton: HTMLAnchorElement;

      beforeEach(() => {
        render();

        act(() => {
          cancelLink = renderResult.getByTestId(
            'createPackagePolicy_cancelBackLink'
          ) as HTMLAnchorElement;

          cancelButton = renderResult.getByTestId(
            'createPackagePolicyCancelButton'
          ) as HTMLAnchorElement;
        });
      });

      it('should use custom "cancel" URL', () => {
        expect(cancelLink.href).toBe(expectedRouteState.onCancelUrl);
        expect(cancelButton.href).toBe(expectedRouteState.onCancelUrl);
      });
    });
  });

  describe('submit page', () => {
    test('should create package policy on submit when query param agent policy id is set', async () => {
      (useLocation as jest.MockedFunction<any>).mockImplementationOnce(() => ({
        search: 'policyId=agent-policy-1',
      }));

      render();

      let saveBtn: HTMLElement;

      await waitFor(() => {
        saveBtn = renderResult.getByText(/Save and continue/).closest('button')!;
        expect(saveBtn).not.toBeDisabled();
      });

      await act(async () => {
        fireEvent.click(saveBtn);
      });

      expect(sendCreatePackagePolicy as jest.MockedFunction<any>).toHaveBeenCalledWith({
        description: '',
        enabled: true,
        inputs: [],
        name: 'nginx-1',
        namespace: 'default',
        output_id: '',
        package: {
          name: 'nginx',
          title: 'Nginx',
          version: '0.3.7',
        },
        policy_id: 'agent-policy-1',
        vars: undefined,
      });
      expect(sendCreateAgentPolicy as jest.MockedFunction<any>).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(renderResult.getByText('Nginx integration added')).toBeInTheDocument();
      });
    });

    test('should create agent policy before creating package policy on submit when new hosts is selected', async () => {
      render();

      await waitFor(() => {
        renderResult.getByDisplayValue('Agent policy 2');
      });

      await act(async () => {
        fireEvent.click(renderResult.getByText(/Save and continue/).closest('button')!);
      });

      expect(sendCreateAgentPolicy as jest.MockedFunction<any>).toHaveBeenCalledWith(
        {
          description: '',
          monitoring_enabled: ['logs', 'metrics'],
          name: 'Agent policy 2',
          namespace: 'default',
        },
        { withSysMonitoring: true }
      );
      expect(sendCreatePackagePolicy as jest.MockedFunction<any>).toHaveBeenCalledWith({
        description: '',
        enabled: true,
        inputs: [],
        name: 'nginx-1',
        namespace: 'default',
        output_id: '',
        package: {
          name: 'nginx',
          title: 'Nginx',
          version: '0.3.7',
        },
        policy_id: 'agent-policy-2',
        vars: undefined,
      });

      await waitFor(() => {
        expect(renderResult.getByText('Nginx integration added')).toBeInTheDocument();
      });
    });
  });
});

const mockApiCalls = (http: MockedFleetStartServices['http']) => {
  http.get.mockImplementation(async (path: any) => {
    if (path === '/api/fleet/agents/setup') {
      return Promise.resolve({ data: { results: { total: 0 } } });
    }
    if (path === '/api/fleet/package_policies') {
      return Promise.resolve({ data: { items: [] } });
    }
    const err = new Error(`API [GET ${path}] is not MOCKED!`);
    // eslint-disable-next-line no-console
    console.log(err);
    throw err;
  });
};
