/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppContextTestRender, createAppRootMockRenderer } from '../../../common/mock/endpoint';
import React from 'react';
import { trustedAppsAllHttpMocks } from '../../pages/mocks';
import { ArtifactListPage, ArtifactListPageProps } from './artifact_list_page';
import { TrustedAppsApiClient } from '../../pages/trusted_apps/service/trusted_apps_api_client';
import { artifactListPageLabels } from './translations';
import { act, waitForElementToBeRemoved } from '@testing-library/react';

describe('When using the ArtifactListPage component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let coreStart: AppContextTestRender['coreStart'];
  let mockedApi: ReturnType<typeof trustedAppsAllHttpMocks>;
  let FormComponentMock: ArtifactListPageProps['ArtifactFormComponent'];

  interface FutureInterface<T = void> {
    promise: Promise<T>;
    resolve: (data: T) => void;
    reject: (e: Error) => void;
  }

  const getFuture = function <T = void>(): FutureInterface<T> {
    let resolve: FutureInterface<T>['resolve'];
    let reject: FutureInterface<T>['reject'];

    const promise = new Promise<T>((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });

    // @ts-ignore
    return { promise, resolve, reject };
  };

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    ({ history, coreStart } = mockedContext);
    mockedApi = trustedAppsAllHttpMocks(coreStart.http);

    const apiClient = TrustedAppsApiClient.getInstance(coreStart.http);
    const labels = { ...artifactListPageLabels };

    FormComponentMock = jest.fn(() => {
      return <div data-test-subj="formMock">{'Form here'}</div>;
    });

    render = (props: Partial<ArtifactListPageProps> = {}) => {
      return (renderResult = mockedContext.render(
        <ArtifactListPage
          apiClient={apiClient}
          ArtifactFormComponent={FormComponentMock}
          labels={labels}
          data-test-subj="testPage"
          {...props}
        />
      ));
    };
  });

  it('should display a loader while determining which view to show', async () => {
    // Mock a delay into the list results http call
    const deferrable = getFuture();
    mockedApi.responseProvider.trustedAppsList.mockDelay.mockReturnValue(deferrable.promise);

    const { getByTestId } = render();
    const loader = getByTestId('testPage-pageLoader');

    expect(loader).not.toBeNull();

    // release the API call
    act(() => {
      deferrable.resolve();
    });

    await waitForElementToBeRemoved(loader);
  });

  describe('and NO data exists', () => {
    beforeEach(() => {
      mockedApi.responseProvider.trustedAppsList.mockReturnValue({
        data: [],
        page: 1,
        per_page: 10,
        total: 0,
      });
    });
  });

  describe('and data exists', () => {
    // FIXME:PT with data
  });
});
