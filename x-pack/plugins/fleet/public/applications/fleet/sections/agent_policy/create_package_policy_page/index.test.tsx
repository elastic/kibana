/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Route, useLocation, useHistory } from 'react-router-dom';
import React from 'react';
import { fireEvent, act, waitFor } from '@testing-library/react';

import type { MockedFleetStartServices, TestRenderer } from '../../../../../mock';
import { createFleetTestRendererMock } from '../../../../../mock';
import { FLEET_ROUTING_PATHS, pagePathGetters, PLUGIN_ID } from '../../../constants';
import type { CreatePackagePolicyRouteState } from '../../../types';

import {
  sendCreatePackagePolicy,
  sendCreateAgentPolicy,
  sendGetAgentStatus,
  useIntraAppState,
  useStartServices,
  useGetPackageInfoByKey,
} from '../../../hooks';

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
    useGetPackageInfoByKey: jest.fn(),
    sendCreatePackagePolicy: jest
      .fn()
      .mockResolvedValue({ data: { item: { id: 'policy-1', inputs: [] } } }),
    sendCreateAgentPolicy: jest.fn().mockResolvedValue({
      data: { item: { id: 'agent-policy-2', name: 'Agent policy 2', namespace: 'default' } },
    }),
    useIntraAppState: jest.fn().mockReturnValue({}),
    useStartServices: jest.fn().mockReturnValue({
      application: { navigateToApp: jest.fn() },
      notifications: {
        toasts: {
          addError: jest.fn(),
          addSuccess: jest.fn(),
        },
      },
      docLinks: {
        links: {
          fleet: {},
        },
      },
      http: {
        basePath: {
          get: () => 'http://localhost:5620',
          prepend: (url: string) => 'http://localhost:5620' + url,
        },
      },
      chrome: {
        docTitle: {
          change: jest.fn(),
        },
        setBreadcrumbs: jest.fn(),
      },
    }),
  };
});

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn().mockReturnValue({ search: '' }),
  useHistory: jest.fn().mockReturnValue({
    push: jest.fn(),
  }),
}));

describe('when on the package policy create page', () => {
  const createPageUrlPath = pagePathGetters.add_integration_to_policy({ pkgkey: 'nginx-1.3.0' })[1];

  let testRenderer: TestRenderer;
  let renderResult: ReturnType<typeof testRenderer.render>;
  const render = () =>
    (renderResult = testRenderer.render(
      <Route path={FLEET_ROUTING_PATHS.add_integration_to_policy}>
        <CreatePackagePolicyPage />
      </Route>
    ));
  let mockPackageInfo: any;

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
    mockApiCalls(testRenderer.startServices.http);
    testRenderer.mountHistory.push(createPageUrlPath);

    // (useGetPackageInfoByKey as jest.Mock).mockClear();

    mockPackageInfo = {
      data: {
        item: {
          name: 'nginx',
          title: 'Nginx',
          version: '1.3.0',
          release: 'ga',
          description: 'Collect logs and metrics from Nginx HTTP servers with Elastic Agent.',
          policy_templates: [
            {
              name: 'nginx',
              title: 'Nginx logs and metrics',
              description: 'Collect logs and metrics from Nginx instances',
              inputs: [
                {
                  type: 'logfile',
                  title: 'Collect logs from Nginx instances',
                  description: 'Collecting Nginx access and error logs',
                },
              ],
              multiple: true,
            },
          ],
          data_streams: [
            {
              type: 'logs',
              dataset: 'nginx.access',
              title: 'Nginx access logs',
              release: 'experimental',
              ingest_pipeline: 'default',
              streams: [
                {
                  input: 'logfile',
                  vars: [
                    {
                      name: 'paths',
                      type: 'text',
                      title: 'Paths',
                      multi: true,
                      required: true,
                      show_user: true,
                      default: ['/var/log/nginx/access.log*'],
                    },
                  ],
                  template_path: 'stream.yml.hbs',
                  title: 'Nginx access logs',
                  description: 'Collect Nginx access logs',
                  enabled: true,
                },
              ],
              package: 'nginx',
              path: 'access',
            },
          ],
          latestVersion: '1.3.0',
          removable: true,
          keepPoliciesUpToDate: false,
          status: 'not_installed',
        },
      },
      isLoading: false,
    };

    (useGetPackageInfoByKey as jest.Mock).mockReturnValue(mockPackageInfo);
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

      test('should use custom "cancel" URL', () => {
        expect(cancelLink.href).toBe(expectedRouteState.onCancelUrl);
        expect(cancelButton.href).toBe(expectedRouteState.onCancelUrl);
      });
    });
  });

  describe('submit page', () => {
    const newPackagePolicy = {
      description: '',
      enabled: true,
      inputs: [
        {
          enabled: true,
          policy_template: 'nginx',
          streams: [
            {
              data_stream: {
                dataset: 'nginx.access',
                type: 'logs',
              },
              enabled: true,
              vars: {
                paths: {
                  type: 'text',
                  value: ['/var/log/nginx/access.log*'],
                },
              },
            },
          ],
          type: 'logfile',
        },
      ],
      name: 'nginx-1',
      namespace: 'default',
      output_id: '',
      package: {
        name: 'nginx',
        title: 'Nginx',
        version: '1.3.0',
      },
      policy_id: 'agent-policy-1',
      vars: undefined,
    };

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
        ...newPackagePolicy,
        policy_id: 'agent-policy-1',
      });
      expect(sendCreateAgentPolicy as jest.MockedFunction<any>).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(renderResult.getByText('Nginx integration added')).toBeInTheDocument();
      });
    });

    describe('on save navigate', () => {
      async function setupSaveNavigate(routeState: any) {
        (useIntraAppState as jest.MockedFunction<any>).mockReturnValue(routeState);
        render();

        await act(async () => {
          fireEvent.click(renderResult.getByText('Existing hosts')!);
        });

        await act(async () => {
          fireEvent.click(renderResult.getByText(/Save and continue/).closest('button')!);
        });

        await act(async () => {
          fireEvent.click(
            renderResult.getByText(/Add Elastic Agent to your hosts/).closest('button')!
          );
        });
      }

      test('should navigate to save navigate path if set', async () => {
        const routeState = {
          onSaveNavigateTo: [PLUGIN_ID, { path: '/save/url/here' }],
        };

        await setupSaveNavigate(routeState);

        expect(useStartServices().application.navigateToApp).toHaveBeenCalledWith(PLUGIN_ID, {
          path: '/save/url/here',
        });
      });

      test('should navigate to save navigate path with query param if set', async () => {
        const mockUseLocation = useLocation as jest.MockedFunction<any>;
        mockUseLocation.mockReturnValue({
          search: 'policyId=agent-policy-1',
        });

        const routeState = {
          onSaveNavigateTo: [PLUGIN_ID, { path: '/save/url/here' }],
        };

        await setupSaveNavigate(routeState);

        expect(useStartServices().application.navigateToApp).toHaveBeenCalledWith(PLUGIN_ID, {
          path: '/policies/agent-policy-1',
        });

        mockUseLocation.mockReturnValue({
          search: '',
        });
      });

      test('should navigate to save navigate app if set', async () => {
        const routeState = {
          onSaveNavigateTo: [PLUGIN_ID],
        };
        await setupSaveNavigate(routeState);

        expect(useStartServices().application.navigateToApp).toHaveBeenCalledWith(PLUGIN_ID);
      });

      test('should set history if no routeState', async () => {
        await setupSaveNavigate({});

        expect(useHistory().push).toHaveBeenCalledWith('/policies/agent-policy-1');
      });
    });

    test('should create agent policy without sys monitoring when new hosts is selected for system integration', async () => {
      (useGetPackageInfoByKey as jest.Mock).mockReturnValue({
        ...mockPackageInfo,
        data: {
          item: {
            ...mockPackageInfo.data!.item,
            name: 'system',
          },
        },
      });

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
        { withSysMonitoring: false }
      );
    });

    describe('without query param', () => {
      beforeEach(() => {
        render();

        (sendCreateAgentPolicy as jest.MockedFunction<any>).mockClear();
        (sendCreatePackagePolicy as jest.MockedFunction<any>).mockClear();
      });

      test('should create agent policy before creating package policy on submit when new hosts is selected', async () => {
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
          ...newPackagePolicy,
          policy_id: 'agent-policy-2',
        });

        await waitFor(() => {
          expect(renderResult.getByText('Nginx integration added')).toBeInTheDocument();
        });
      });

      test('should disable submit button on invalid form with empty agent policy name', async () => {
        await act(async () => {
          fireEvent.change(renderResult.getByLabelText('New agent policy name'), {
            target: { value: '' },
          });
        });

        renderResult.getByText(
          'Your integration policy has errors. Please fix them before saving.'
        );
        expect(renderResult.getByText(/Save and continue/).closest('button')!).toBeDisabled();
      });

      test('should not show modal if agent policy has agents', async () => {
        (sendGetAgentStatus as jest.MockedFunction<any>).mockResolvedValueOnce({
          data: { results: { total: 1 } },
        });

        await act(async () => {
          fireEvent.click(renderResult.getByText('Existing hosts')!);
        });

        await act(async () => {
          fireEvent.click(renderResult.getByText(/Save and continue/).closest('button')!);
        });

        await waitFor(() => {
          expect(renderResult.getByText('This action will update 1 agent')).toBeInTheDocument();
        });

        await act(async () => {
          fireEvent.click(
            renderResult.getAllByText(/Save and deploy changes/)[1].closest('button')!
          );
        });

        expect(sendCreatePackagePolicy as jest.MockedFunction<any>).toHaveBeenCalled();
      });

      describe('create package policy with existing agent policy', () => {
        beforeEach(async () => {
          await act(async () => {
            fireEvent.click(renderResult.getByText('Existing hosts')!);
          });
        });

        test('should creating package policy with existing host', async () => {
          await act(async () => {
            fireEvent.click(renderResult.getByText(/Save and continue/).closest('button')!);
          });

          expect(sendCreateAgentPolicy as jest.MockedFunction<any>).not.toHaveBeenCalled();
          expect(sendCreatePackagePolicy as jest.MockedFunction<any>).toHaveBeenCalledWith({
            ...newPackagePolicy,
            policy_id: 'agent-policy-1',
          });

          await waitFor(() => {
            expect(renderResult.getByText('Nginx integration added')).toBeInTheDocument();
          });
        });

        test('should disable submit button on invalid form with empty name', async () => {
          await act(async () => {
            fireEvent.change(renderResult.getByLabelText('Integration name'), {
              target: { value: '' },
            });
          });

          renderResult.getByText(
            'Your integration policy has errors. Please fix them before saving.'
          );
          expect(renderResult.getByText(/Save and continue/).closest('button')!).toBeDisabled();
        });

        test('should disable submit button on invalid form with empty package var', async () => {
          await act(async () => {
            fireEvent.click(renderResult.getByLabelText('Show logfile inputs'));
          });

          await act(async () => {
            fireEvent.change(renderResult.getByDisplayValue('/var/log/nginx/access.log*'), {
              target: { value: '' },
            });
          });

          renderResult.getByText(
            'Your integration policy has errors. Please fix them before saving.'
          );
          expect(renderResult.getByText(/Save and continue/).closest('button')!).toBeDisabled();
        });

        test('should submit form with changed package var', async () => {
          await act(async () => {
            fireEvent.click(renderResult.getByLabelText('Show logfile inputs'));
          });

          await act(async () => {
            fireEvent.change(renderResult.getByDisplayValue('/var/log/nginx/access.log*'), {
              target: { value: '/path/to/log' },
            });
          });

          await act(async () => {
            fireEvent.click(renderResult.getByText(/Save and continue/).closest('button')!);
          });

          expect(sendCreatePackagePolicy as jest.MockedFunction<any>).toHaveBeenCalledWith({
            ...newPackagePolicy,
            inputs: [
              {
                ...newPackagePolicy.inputs[0],
                streams: [
                  {
                    ...newPackagePolicy.inputs[0].streams[0],
                    vars: {
                      paths: {
                        type: 'text',
                        value: ['/path/to/log'],
                      },
                    },
                  },
                ],
              },
            ],
          });
        });
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
