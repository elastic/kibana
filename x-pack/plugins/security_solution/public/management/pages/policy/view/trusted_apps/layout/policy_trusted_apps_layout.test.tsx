/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { PolicyTrustedAppsLayout } from './policy_trusted_apps_layout';
import * as reactTestingLibrary from '@testing-library/react';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../../common/mock/endpoint';
import { MiddlewareActionSpyHelper } from '../../../../../../common/store/test_utils';

import { createLoadedResourceState, isLoadedResourceState } from '../../../../../state';
import { getPolicyDetailsArtifactsListPath } from '../../../../../common/routing';
import { EndpointDocGenerator } from '../../../../../../../common/endpoint/generate_data';
import { policyListApiPathHandlers } from '../../../store/test_mock_utils';
import { useEndpointPrivileges } from '../../../../../../common/components/user_privileges/endpoint/use_endpoint_privileges';
import { getEndpointPrivilegesInitialStateMock } from '../../../../../../common/components/user_privileges/endpoint/mocks';
import { PACKAGE_POLICY_API_ROOT, AGENT_API_ROUTES } from '../../../../../../../../fleet/common';
import { trustedAppsAllHttpMocks } from '../../../../mocks';
import { HttpFetchOptionsWithPath } from 'kibana/public';
import { ExceptionsListItemGenerator } from '../../../../../../../common/endpoint/data_generators/exceptions_list_item_generator';

jest.mock('../../../../../../common/components/user_privileges/endpoint/use_endpoint_privileges');
const mockUseEndpointPrivileges = useEndpointPrivileges as jest.Mock;

let mockedContext: AppContextTestRender;
let waitForAction: MiddlewareActionSpyHelper['waitForAction'];
let render: () => ReturnType<AppContextTestRender['render']>;
let coreStart: AppContextTestRender['coreStart'];
let http: typeof coreStart.http;
let mockedApis: ReturnType<typeof trustedAppsAllHttpMocks>;
const generator = new EndpointDocGenerator();

describe('Policy trusted apps layout', () => {
  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    http = mockedContext.coreStart.http;

    const policyListApiHandlers = policyListApiPathHandlers();

    http.get.mockImplementation((...args) => {
      const [path] = args;
      if (typeof path === 'string') {
        // GET datasouce
        if (path === `${PACKAGE_POLICY_API_ROOT}/1234`) {
          return Promise.resolve({
            item: generator.generatePolicyPackagePolicy(),
            success: true,
          });
        }

        // GET Agent status for agent policy
        if (path === `${AGENT_API_ROUTES.STATUS_PATTERN}`) {
          return Promise.resolve({
            results: { events: 0, total: 5, online: 3, error: 1, offline: 1 },
            success: true,
          });
        }

        // Get package data
        // Used in tests that route back to the list
        if (policyListApiHandlers[path]) {
          return Promise.resolve(policyListApiHandlers[path]());
        }
      }

      return Promise.reject(new Error(`unknown API call (not MOCKED): ${path}`));
    });

    mockedApis = trustedAppsAllHttpMocks(http);
    waitForAction = mockedContext.middlewareSpy.waitForAction;
    render = () => mockedContext.render(<PolicyTrustedAppsLayout />);
  });

  afterAll(() => {
    mockUseEndpointPrivileges.mockReset();
  });

  afterEach(() => reactTestingLibrary.cleanup());

  it('should renders layout with no existing TA data', async () => {
    mockedApis.responseProvider.trustedAppsList.mockImplementation(() => ({
      data: [],
      page: 1,
      per_page: 10,
      total: 0,
    }));
    mockedContext.history.push(getPolicyDetailsArtifactsListPath('1234'));
    const component = render();

    await waitForAction('policyArtifactsHasTrustedApps', {
      validate: (action) => isLoadedResourceState(action.payload),
    });

    expect(component.getByTestId('policy-trusted-apps-empty-unexisting')).not.toBeNull();
  });

  it('should renders layout with no assigned TA data', async () => {
    mockedApis.responseProvider.trustedAppsList.mockImplementation(() => ({
      data: [],
      page: 1,
      per_page: 10,
      total: 0,
    }));
    mockedContext.history.push(getPolicyDetailsArtifactsListPath('1234'));
    const component = render();

    await waitForAction('policyArtifactsHasTrustedApps', {
      validate: (action) => isLoadedResourceState(action.payload),
    });

    mockedContext.store.dispatch({
      type: 'policyArtifactsDeosAnyTrustedAppExists',
      payload: createLoadedResourceState({ data: [], total: 1 }),
    });

    expect(component.getByTestId('policy-trusted-apps-empty-unassigned')).not.toBeNull();
  });

  it('should renders layout with data', async () => {
    mockedContext.history.push(getPolicyDetailsArtifactsListPath('1234'));
    const component = render();

    await waitForAction('policyArtifactsHasTrustedApps', {
      validate: (action) => isLoadedResourceState(action.payload),
    });

    expect(component.getAllByTestId('policyTrustedAppsGrid-card')).toHaveLength(10);
  });

  it('should renders layout with data but no results', async () => {
    mockedApis.responseProvider.trustedAppsList.mockImplementation(
      (options: HttpFetchOptionsWithPath) => {
        const hasAnyQuery =
          '(exception-list-agnostic.attributes.tags:"policy:1234" OR exception-list-agnostic.attributes.tags:"policy:all")';
        if (options.query?.filter === hasAnyQuery) {
          const exceptionsGenerator = new ExceptionsListItemGenerator('seed');
          return {
            data: Array.from({ length: 10 }, () =>
              exceptionsGenerator.generate({ os_types: ['windows'] })
            ),
            total: 10,
            page: 0,
            per_page: 10,
          };
        } else {
          return { data: [], total: 0, page: 0, per_page: 10 };
        }
      }
    );

    const component = render();
    mockedContext.history.push(getPolicyDetailsArtifactsListPath('1234', { filter: 'search' }));

    await waitForAction('policyArtifactsHasTrustedApps', {
      validate: (action) => isLoadedResourceState(action.payload),
    });

    expect(component.queryAllByTestId('policyTrustedAppsGrid-card')).toHaveLength(0);
    expect(component.queryByTestId('policy-trusted-apps-empty-unassigned')).toBeNull();
    expect(component.queryByTestId('policy-trusted-apps-empty-unexisting')).toBeNull();
  });

  it('should hide assign button on empty state with unassigned policies when downgraded to a gold or below license', async () => {
    mockUseEndpointPrivileges.mockReturnValue(
      getEndpointPrivilegesInitialStateMock({
        canCreateArtifactsByPolicy: false,
      })
    );
    const component = render();
    mockedContext.history.push(getPolicyDetailsArtifactsListPath('1234'));

    await waitForAction('assignedTrustedAppsListStateChanged');

    mockedContext.store.dispatch({
      type: 'policyArtifactsDeosAnyTrustedAppExists',
      payload: createLoadedResourceState(true),
    });
    expect(component.queryByTestId('assign-ta-button')).toBeNull();
  });

  it('should hide the `Assign trusted applications` button when there is data and the license is downgraded to gold or below', async () => {
    mockUseEndpointPrivileges.mockReturnValue(
      getEndpointPrivilegesInitialStateMock({
        canCreateArtifactsByPolicy: false,
      })
    );
    const component = render();
    mockedContext.history.push(getPolicyDetailsArtifactsListPath('1234'));

    await waitForAction('assignedTrustedAppsListStateChanged');
    expect(component.queryByTestId('assignTrustedAppButton')).toBeNull();
  });
});
