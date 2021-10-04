/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { PolicyTrustedAppsLayout } from './policy_trusted_apps_layout';
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
import { createLoadedResourceState, isLoadedResourceState } from '../../../../../state';
import { getPolicyDetailsArtifactsListPath } from '../../../../../common/routing';

jest.mock('../../../../trusted_apps/service');

let mockedContext: AppContextTestRender;
let waitForAction: MiddlewareActionSpyHelper['waitForAction'];
let render: () => ReturnType<AppContextTestRender['render']>;
const act = reactTestingLibrary.act;
const TrustedAppsHttpServiceMock = TrustedAppsHttpService as jest.Mock;
let getState: () => PolicyDetailsState;

describe('Policy trusted apps layout', () => {
  beforeEach(() => {
    TrustedAppsHttpServiceMock.mockImplementation(() => {
      return {
        getTrustedAppsList: () => getMockListResponse(),
      };
    });
    mockedContext = createAppRootMockRenderer();
    waitForAction = mockedContext.middlewareSpy.waitForAction;
    getState = () => mockedContext.store.getState().management.policyDetails;
    render = () => mockedContext.render(<PolicyTrustedAppsLayout />);
  });

  afterEach(() => reactTestingLibrary.cleanup());

  it('should renders layout with no TA data', async () => {
    // const waitAssignableListExist = waitForAction('policyArtifactsAssignableListExistDataChanged', {
    //   validate: (action) => isLoadedResourceState(action.payload),
    // });

    TrustedAppsHttpServiceMock.mockImplementation(() => {
      return {
        getTrustedAppsList: () => ({ data: [] }),
      };
    });
    const component = render();

    mockedContext.history.push(getPolicyDetailsArtifactsListPath('1234'));

    await waitForAction('policyArtifactsDeosAnyTrustedApp', {
      validate: (action) => isLoadedResourceState(action.payload),
    });
    // await waitAssignableListExist;

    expect(component.getByTestId('policy-trusted-apps-empty-unexisting')).not.toBeNull();
  });
});
