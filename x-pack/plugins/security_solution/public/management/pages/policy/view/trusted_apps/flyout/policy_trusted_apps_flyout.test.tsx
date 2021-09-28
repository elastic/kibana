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

import { TrustedAppsHttpService } from '../../../../trusted_apps/service';
import { PolicyDetailsState } from '../../../types';
import { getMockCreateResponse, getMockListResponse } from '../../../test_utils';
import { createLoadedResourceState } from '../../../../../state';

jest.mock('../../../../trusted_apps/service');

let mockedContext: AppContextTestRender;
let waitForAction: MiddlewareActionSpyHelper['waitForAction'];
let render: () => ReturnType<AppContextTestRender['render']>;
const act = reactTestingLibrary.act;
const TrustedAppsHttpServiceMock = TrustedAppsHttpService as jest.Mock;
let getState: () => PolicyDetailsState;

describe('Policy trusted apps flyout', () => {
  beforeEach(() => {
    TrustedAppsHttpServiceMock.mockImplementation(() => {
      return {
        getTrustedAppsList: () => getMockListResponse(),
        updateTrustedApp: () => ({
          data: getMockCreateResponse(),
        }),
      };
    });
    mockedContext = createAppRootMockRenderer();
    waitForAction = mockedContext.middlewareSpy.waitForAction;
    getState = () => mockedContext.store.getState().management.policyDetails;
    render = () => mockedContext.render(<PolicyTrustedAppsFlyout />);
  });

  afterEach(() => reactTestingLibrary.cleanup());

  it('should renders flyout open correctly without assignable data', async () => {
    const waitAssignableListExist = waitForAction('policyArtifactsAssignableListExistDataChanged');

    TrustedAppsHttpServiceMock.mockImplementation(() => {
      return {
        getTrustedAppsList: () => ({ data: [] }),
      };
    });
    const component = render();
    mockedContext.store.dispatch({
      type: 'userChangedUrl',
      payload: {
        pathname: '/administration/policy/1234/trustedApps',
        search: '?show=list',
        hash: '',
      },
    });
    await waitForAction('policyArtifactsAssignableListPageDataChanged');
    await waitAssignableListExist;

    expect(component.getByTestId('confirmPolicyTrustedAppsFlyout')).not.toBeNull();
    expect(component.getByTestId('noAssignableItemsTrustedAppsFlyout')).not.toBeNull();
  });

  it('should renders flyout open correctly without data', async () => {
    TrustedAppsHttpServiceMock.mockImplementation(() => {
      return {
        getTrustedAppsList: () => ({ data: [] }),
      };
    });
    const component = render();
    mockedContext.store.dispatch({
      type: 'userChangedUrl',
      payload: {
        pathname: '/administration/policy/1234/trustedApps',
        search: '?show=list',
        hash: '',
      },
    });
    await waitForAction('policyArtifactsAssignableListPageDataChanged');

    mockedContext.store.dispatch({
      type: 'policyArtifactsAssignableListExistDataChanged',
      payload: createLoadedResourceState(true),
    });

    expect(component.getByTestId('confirmPolicyTrustedAppsFlyout')).not.toBeNull();
    expect(component.getByTestId('noItemsFoundTrustedAppsFlyout')).not.toBeNull();
  });

  it('should renders flyout open correctly', async () => {
    const component = render();
    mockedContext.store.dispatch({
      type: 'userChangedUrl',
      payload: {
        pathname: '/administration/policy/1234/trustedApps',
        search: '?show=list',
        hash: '',
      },
    });
    await waitForAction('policyArtifactsAssignableListPageDataChanged');

    expect(component.getByTestId('confirmPolicyTrustedAppsFlyout')).not.toBeNull();
    expect(component.getByTestId(`${getMockListResponse().data[0].name}_checkbox`)).not.toBeNull();
  });

  it('should confirm flyout action', async () => {
    const waitForUpdate = waitForAction('policyArtifactsUpdateTrustedAppsChanged');
    const waitChangeUrl = waitForAction('userChangedUrl');
    const component = render();
    mockedContext.store.dispatch({
      type: 'userChangedUrl',
      payload: {
        pathname: '/administration/policy/1234/trustedApps',
        search: '?show=list',
        hash: '',
      },
    });
    await waitForAction('policyArtifactsAssignableListPageDataChanged');

    const tACardCheckbox = component.getByTestId(`${getMockListResponse().data[0].name}_checkbox`);

    await act(async () => {
      fireEvent.click(tACardCheckbox);
    });

    const confirmButton = component.getByTestId('confirmPolicyTrustedAppsFlyout');

    await act(async () => {
      fireEvent.click(confirmButton);
    });

    await waitForUpdate;
    await waitChangeUrl;
    const currentLocation = getState().artifacts.location;
    expect(currentLocation.show).toBeUndefined();
  });

  it('should cancel flyout action', async () => {
    const waitChangeUrl = waitForAction('userChangedUrl');
    const component = render();
    mockedContext.store.dispatch({
      type: 'userChangedUrl',
      payload: {
        pathname: '/administration/policy/1234/trustedApps',
        search: '?show=list',
        hash: '',
      },
    });
    await waitForAction('policyArtifactsAssignableListPageDataChanged');

    const cancelButton = component.getByTestId('cancelPolicyTrustedAppsFlyout');

    await act(async () => {
      fireEvent.click(cancelButton);
    });

    await waitChangeUrl;
    const currentLocation = getState().artifacts.location;
    expect(currentLocation.show).toBeUndefined();
  });

  it('should display warning message when too much results', async () => {
    TrustedAppsHttpServiceMock.mockImplementation(() => {
      return {
        getTrustedAppsList: () => ({ ...getMockListResponse(), total: 101 }),
      };
    });

    const component = render();
    mockedContext.store.dispatch({
      type: 'userChangedUrl',
      payload: {
        pathname: '/administration/policy/1234/trustedApps',
        search: '?show=list',
        hash: '',
      },
    });
    await waitForAction('policyArtifactsAssignableListPageDataChanged');

    expect(component.getByTestId('tooMuchResultsWarningMessageTrustedAppsFlyout')).not.toBeNull();
  });

  it('should not display warning message when few results', async () => {
    const component = render();
    mockedContext.store.dispatch({
      type: 'userChangedUrl',
      payload: {
        pathname: '/administration/policy/1234/trustedApps',
        search: '?show=list',
        hash: '',
      },
    });
    await waitForAction('policyArtifactsAssignableListPageDataChanged');

    expect(component.queryByTestId('tooMuchResultsWarningMessageTrustedAppsFlyout')).toBeNull();
  });
});
