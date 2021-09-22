/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { RenderResult, act } from '@testing-library/react';
// import { fireEvent, waitFor } from '@testing-library/dom';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../../common/mock/endpoint';
import { PolicyTrustedAppsFlyout } from './policy_trusted_apps_flyout';
import { PolicyDetailsState } from '../../../types';
import { TrustedAppsHttpService } from '../../../../trusted_apps/service';
import {
  TrustedApp,
  OperatingSystem,
  ConditionEntryField,
  GetTrustedListAppsResponse,
} from '../../../../../../../common/endpoint/types';

jest.mock('../../../../trusted_apps/service');
// jest.mock('../../../../../../common/lib/kibana');
// jest.mock('../../../../../../common/containers/source');
const TrustedAppsHttpServiceMock = TrustedAppsHttpService as jest.Mock;

const getFakeTrustedApp = (): TrustedApp => ({
  id: '1111-2222-3333-4444',
  version: 'abc123',
  name: 'one app',
  os: OperatingSystem.WINDOWS,
  created_at: '2021-01-04T13:55:00.561Z',
  created_by: 'me',
  updated_at: '2021-01-04T13:55:00.561Z',
  updated_by: 'me',
  description: 'a good one',
  effectScope: { type: 'policy', policies: [] },
  entries: [
    {
      field: ConditionEntryField.PATH,
      value: 'one/two',
      operator: 'included',
      type: 'match',
    },
  ],
});

const createListApiResponse = (
  page: number = 1,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  per_page: number = 20
): GetTrustedListAppsResponse => {
  return {
    data: [getFakeTrustedApp()],
    total: 50, // << Should be a value large enough to fulfill two pages
    page,
    per_page,
  };
};

describe('Policy Trusted Apps flyout form', () => {
  let component: RenderResult;
  let mockedContext: AppContextTestRender;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderWithData: () => Promise<ReturnType<AppContextTestRender['render']>>;
  let getState: () => PolicyDetailsState['artifacts'];

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    getState = () => mockedContext.store.getState().management.policyDetails.artifacts;
    render = () => mockedContext.render(<PolicyTrustedAppsFlyout />);
    renderWithData = async () => {
      const renderResult = render();
      //   const entry = getInitialExceptionFromEvent(ecsEventMock());
      //   act(() => {
      //     mockedContext.store.dispatch({
      //       type: 'eventFiltersInitForm',
      //       payload: { entry },
      //     });
      //   });
      //   await waitFor(() => {
      //     expect(renderResult.getByTestId('exceptionsBuilderWrapper')).toBeInTheDocument();
      //   });
      return renderResult;
    };

    // (useFetchIndex as jest.Mock).mockImplementation(() => [
    //   false,
    //   {
    //     indexPatterns: stubIndexPattern,
    //   },
    // ]);
    // (useCurrentUser as jest.Mock).mockReturnValue({ username: 'test-username' });
    // (useKibana as jest.Mock).mockReturnValue({
    //   services: {
    //     http: {},
    //     data: {},
    //     notifications: {},
    //   },
    // });
  });

  afterEach(() => {
    TrustedAppsHttpServiceMock.mockReset();
  });

  it.skip('should renders correctly without data', () => {
    TrustedAppsHttpServiceMock.mockImplementationOnce(() => {
      return {
        getTrustedAppsList: () => ({}),
      };
    });
    component = render();
    expect(component.getByTestId('')).not.toBeNull();
  });

  it('should renders correctly whith data', () => {
    TrustedAppsHttpServiceMock.mockImplementationOnce(() => {
      return {
        getTrustedAppsList: () => createListApiResponse(),
      };
    });
    component = render();
    expect(component.getByTestId('loading-spinner')).not.toBeNull();
  });
});
