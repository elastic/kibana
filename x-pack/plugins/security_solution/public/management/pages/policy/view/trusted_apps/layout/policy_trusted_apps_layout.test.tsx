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

import { TrustedAppsHttpService } from '../../../../trusted_apps/service';
import { getMockListResponse } from '../../../test_utils';
import { createLoadedResourceState, isLoadedResourceState } from '../../../../../state';
import { getPolicyDetailsArtifactsListPath } from '../../../../../common/routing';
import { EndpointDocGenerator } from '../../../../../../../common/endpoint/generate_data';
import { policyListApiPathHandlers } from '../../../store/test_mock_utils';
import { licenseService } from '../../../../../../common/hooks/use_license';

jest.mock('../../../../trusted_apps/service');
jest.mock('../../../../../../common/hooks/use_license', () => {
  const licenseServiceInstance = {
    isPlatinumPlus: jest.fn(),
  };
  return {
    licenseService: licenseServiceInstance,
    useLicense: () => {
      return licenseServiceInstance;
    },
  };
});

let mockedContext: AppContextTestRender;
let waitForAction: MiddlewareActionSpyHelper['waitForAction'];
let render: () => ReturnType<AppContextTestRender['render']>;
const TrustedAppsHttpServiceMock = TrustedAppsHttpService as jest.Mock;
let coreStart: AppContextTestRender['coreStart'];
let http: typeof coreStart.http;
const generator = new EndpointDocGenerator();

describe.skip('Policy trusted apps layout', () => {
  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    http = mockedContext.coreStart.http;
    const policyListApiHandlers = policyListApiPathHandlers();
    http.get.mockImplementation((...args) => {
      const [path] = args;
      if (typeof path === 'string') {
        // GET datasouce
        if (path === '/api/fleet/package_policies/1234') {
          return Promise.resolve({
            item: generator.generatePolicyPackagePolicy(),
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
    TrustedAppsHttpServiceMock.mockImplementation(() => {
      return {
        getTrustedAppsList: () => ({ data: [] }),
      };
    });

    waitForAction = mockedContext.middlewareSpy.waitForAction;
    render = () => mockedContext.render(<PolicyTrustedAppsLayout />);
  });

  afterEach(() => reactTestingLibrary.cleanup());

  it('should renders layout with no existing TA data', async () => {
    const component = render();

    mockedContext.history.push(getPolicyDetailsArtifactsListPath('1234'));

    await waitForAction('policyArtifactsDeosAnyTrustedAppExists', {
      validate: (action) => isLoadedResourceState(action.payload),
    });

    expect(component.getByTestId('policy-trusted-apps-empty-unexisting')).not.toBeNull();
  });

  it('should renders layout with no assigned TA data', async () => {
    const component = render();
    mockedContext.history.push(getPolicyDetailsArtifactsListPath('1234'));

    await waitForAction('assignedTrustedAppsListStateChanged');

    mockedContext.store.dispatch({
      type: 'policyArtifactsDeosAnyTrustedAppExists',
      payload: createLoadedResourceState(true),
    });

    expect(component.getByTestId('policy-trusted-apps-empty-unassigned')).not.toBeNull();
  });

  it('should renders layout with data', async () => {
    TrustedAppsHttpServiceMock.mockImplementation(() => {
      return {
        getTrustedAppsList: () => getMockListResponse(),
      };
    });
    const component = render();
    mockedContext.history.push(getPolicyDetailsArtifactsListPath('1234'));

    await waitForAction('assignedTrustedAppsListStateChanged');

    expect(component.getByTestId('policyDetailsTrustedAppsCount')).not.toBeNull();
  });

  it('should hide assign button on empty state with unassigned policies when downgraded to a gold or below license', async () => {
    (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(false);
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
    (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(false);
    TrustedAppsHttpServiceMock.mockImplementation(() => {
      return {
        getTrustedAppsList: () => getMockListResponse(),
      };
    });
    const component = render();
    mockedContext.history.push(getPolicyDetailsArtifactsListPath('1234'));

    await waitForAction('assignedTrustedAppsListStateChanged');
    expect(component.queryByTestId('assignTrustedAppButton')).toBeNull();
  });
});
