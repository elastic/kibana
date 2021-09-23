/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { PolicyTrustedAppsFlyout } from './policy_trusted_apps_flyout';
import * as reactTestingLibrary from '@testing-library/react';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../../common/mock/endpoint';
import { MiddlewareActionSpyHelper } from '../../../../../../common/store/test_utils';

import { TrustedAppsHttpService } from '../../../../trusted_apps/service';
import { PolicyDetailsState } from '../../../types';
import { getListResponse } from '../../../test_utils';

jest.mock('../../../../trusted_apps/service');

let mockedContext: AppContextTestRender;
let waitForAction: MiddlewareActionSpyHelper['waitForAction'];
let render: () => ReturnType<AppContextTestRender['render']>;
// const act = reactTestingLibrary.act;
const TrustedAppsHttpServiceMock = TrustedAppsHttpService as jest.Mock;
let getState: () => PolicyDetailsState;

describe('Policy trusted apps flyout', () => {
  beforeAll(() => {
    TrustedAppsHttpServiceMock.mockImplementation(() => {
      return {
        getTrustedAppsList: () => getListResponse(),
      };
    });
  });
  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    waitForAction = mockedContext.middlewareSpy.waitForAction;
    getState = () => mockedContext.store.getState().management.policyDetails;
    render = () => mockedContext.render(<PolicyTrustedAppsFlyout />);
  });

  afterEach(() => reactTestingLibrary.cleanup());

  it('should renders correctly', async () => {
    const component = render();
    mockedContext.store.dispatch({
      type: 'userChangedUrl',
      payload: {
        pathname: '/administration/policy/1234/trustedApps',
        search: '?show=list',
        hash: '',
      },
    });

    // await waitForAction('policyArtifactsAvailableListPageDataChanged');
    // expect(component.getAllByText('Add event filter')).not.toBeNull();
  });
});
