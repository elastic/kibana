/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { PolicyTrustedAppsFlyout } from './policy_trusted_apps_flyout';
import * as reactTestingLibrary from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../../common/mock/endpoint';
import { MiddlewareActionSpyHelper } from '../../../../../../common/store/test_utils';

import { PolicyDetailsState } from '../../../types';
import { createLoadedResourceState, isLoadedResourceState } from '../../../../../state';
import { getPolicyDetailsArtifactsListPath } from '../../../../../common/routing';
import { trustedAppsAllHttpMocks } from '../../../../mocks';
import { HttpFetchOptionsWithPath } from 'kibana/public';

jest.mock('../../../../../../common/components/user_privileges/endpoint/use_endpoint_privileges');

let mockedContext: AppContextTestRender;
let waitForAction: MiddlewareActionSpyHelper['waitForAction'];
let render: () => ReturnType<AppContextTestRender['render']>;
let mockedApis: ReturnType<typeof trustedAppsAllHttpMocks>;
const act = reactTestingLibrary.act;
let getState: () => PolicyDetailsState;

describe('Policy trusted apps flyout', () => {
  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    waitForAction = mockedContext.middlewareSpy.waitForAction;
    mockedApis = trustedAppsAllHttpMocks(mockedContext.coreStart.http);
    getState = () => mockedContext.store.getState().management.policyDetails;
    render = () => mockedContext.render(<PolicyTrustedAppsFlyout />);
  });

  afterEach(() => reactTestingLibrary.cleanup());

  it('should renders flyout open correctly without assignable data', async () => {
    const waitAssignableListExist = waitForAction('policyArtifactsAssignableListExistDataChanged', {
      validate: (action) => isLoadedResourceState(action.payload),
    });

    mockedApis.responseProvider.trustedAppsList.mockReturnValue({
      data: [],
      total: 0,
      per_page: 10,
      page: 1,
    });

    const component = render();

    mockedContext.history.push(getPolicyDetailsArtifactsListPath('1234', { show: 'list' }));

    await waitForAction('policyArtifactsAssignableListPageDataChanged', {
      validate: (action) => isLoadedResourceState(action.payload),
    });
    await waitAssignableListExist;

    expect(component.getByTestId('confirmPolicyTrustedAppsFlyout')).not.toBeNull();
    expect(component.getByTestId('noAssignableItemsTrustedAppsFlyout')).not.toBeNull();
  });

  it('should renders flyout open correctly without data', async () => {
    mockedApis.responseProvider.trustedAppsList.mockReturnValue({
      data: [],
      total: 0,
      per_page: 10,
      page: 1,
    });
    const component = render();

    mockedContext.history.push(getPolicyDetailsArtifactsListPath('1234', { show: 'list' }));
    await waitForAction('policyArtifactsAssignableListPageDataChanged', {
      validate: (action) => isLoadedResourceState(action.payload),
    });

    mockedContext.store.dispatch({
      type: 'policyArtifactsAssignableListExistDataChanged',
      payload: createLoadedResourceState(true),
    });

    expect(component.getByTestId('confirmPolicyTrustedAppsFlyout')).not.toBeNull();
    expect(component.getByTestId('noItemsFoundTrustedAppsFlyout')).not.toBeNull();
  });

  it('should renders flyout open correctly', async () => {
    const component = render();

    mockedContext.history.push(getPolicyDetailsArtifactsListPath('1234', { show: 'list' }));
    await waitForAction('policyArtifactsAssignableListPageDataChanged', {
      validate: (action) => isLoadedResourceState(action.payload),
    });

    expect(component.getByTestId('confirmPolicyTrustedAppsFlyout')).not.toBeNull();
    expect(component.getByTestId('Generated Exception (u6kh2)_checkbox')).not.toBeNull();
  });

  it('should confirm flyout action', async () => {
    const component = render();

    mockedContext.history.push(
      getPolicyDetailsArtifactsListPath('2d95bec3-b48f-4db7-9622-a2b061cc031d', { show: 'list' })
    );
    await waitForAction('policyArtifactsAssignableListPageDataChanged', {
      validate: (action) => isLoadedResourceState(action.payload),
    });

    // TA name below in the selector matches the 3rd generated trusted app which is policy specific
    const tACardCheckbox = component.getByTestId('Generated Exception (3xnng)_checkbox');

    act(() => {
      fireEvent.click(tACardCheckbox);
    });

    const waitChangeUrl = waitForAction('userChangedUrl');
    const confirmButton = component.getByTestId('confirmPolicyTrustedAppsFlyout');

    act(() => {
      fireEvent.click(confirmButton);
    });

    await waitChangeUrl;

    const currentLocation = getState().artifacts.location;

    expect(currentLocation.show).toBeUndefined();
  });

  it('should cancel flyout action', async () => {
    const waitChangeUrl = waitForAction('userChangedUrl');
    const component = render();

    mockedContext.history.push(getPolicyDetailsArtifactsListPath('1234', { show: 'list' }));
    await waitForAction('policyArtifactsAssignableListPageDataChanged', {
      validate: (action) => isLoadedResourceState(action.payload),
    });

    const cancelButton = component.getByTestId('cancelPolicyTrustedAppsFlyout');

    await act(async () => {
      fireEvent.click(cancelButton);
    });

    await waitChangeUrl;
    const currentLocation = getState().artifacts.location;
    expect(currentLocation.show).toBeUndefined();
  });

  it('should display warning message when too much results', async () => {
    const listResponse = {
      ...mockedApis.responseProvider.trustedAppsList.getMockImplementation()!({
        query: {},
      } as HttpFetchOptionsWithPath),
      total: 101,
    };
    mockedApis.responseProvider.trustedAppsList.mockReturnValue(listResponse);

    const component = render();

    mockedContext.history.push(getPolicyDetailsArtifactsListPath('1234', { show: 'list' }));
    await waitForAction('policyArtifactsAssignableListPageDataChanged', {
      validate: (action) => isLoadedResourceState(action.payload),
    });

    expect(component.getByTestId('tooMuchResultsWarningMessageTrustedAppsFlyout')).not.toBeNull();
  });

  it('should not display warning message when few results', async () => {
    const component = render();

    mockedContext.history.push(getPolicyDetailsArtifactsListPath('1234', { show: 'list' }));
    await waitForAction('policyArtifactsAssignableListPageDataChanged', {
      validate: (action) => isLoadedResourceState(action.payload),
    });

    expect(component.queryByTestId('tooMuchResultsWarningMessageTrustedAppsFlyout')).toBeNull();
  });
});
