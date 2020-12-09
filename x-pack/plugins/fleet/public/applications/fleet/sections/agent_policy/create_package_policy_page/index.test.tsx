/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createTestRendererMock, MockedFleetStartServices, TestRenderer } from '../../../mock';
import { PAGE_ROUTING_PATHS, pagePathGetters, PLUGIN_ID } from '../../../constants';
import { Route } from 'react-router-dom';
import { CreatePackagePolicyPage } from './index';
import React from 'react';
import { CreatePackagePolicyRouteState } from '../../../types';
import { act } from 'react-test-renderer';

describe('when on the package policy create page', () => {
  const createPageUrlPath = pagePathGetters.add_integration_to_policy({ pkgkey: 'nginx-0.3.7' });
  let testRenderer: TestRenderer;
  let renderResult: ReturnType<typeof testRenderer.render>;
  const render = () =>
    (renderResult = testRenderer.render(
      <Route path={PAGE_ROUTING_PATHS.add_integration_to_policy}>
        <CreatePackagePolicyPage />
      </Route>
    ));

  beforeEach(() => {
    testRenderer = createTestRendererMock();
    mockApiCalls(testRenderer.startServices.http);
    testRenderer.history.push(createPageUrlPath);
  });

  describe('and Route state is provided via Fleet HashRouter', () => {
    let expectedRouteState: CreatePackagePolicyRouteState;

    beforeEach(() => {
      expectedRouteState = {
        onCancelUrl: 'http://cancel/url/here',
        onCancelNavigateTo: [PLUGIN_ID, { path: '/cancel/url/here' }],
      };

      testRenderer.history.replace({
        pathname: createPageUrlPath,
        state: expectedRouteState,
      });
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

      it('should redirect via Fleet HashRouter when cancel link is clicked', () => {
        act(() => {
          cancelLink.click();
        });
        expect(testRenderer.history.location.pathname).toBe('/cancel/url/here');
      });

      it('should redirect via Fleet HashRouter when cancel Button (button bar) is clicked', () => {
        act(() => {
          cancelButton.click();
        });
        expect(testRenderer.history.location.pathname).toBe('/cancel/url/here');
      });
    });
  });
});

const mockApiCalls = (http: MockedFleetStartServices['http']) => {
  http.get.mockImplementation(async (path) => {
    const err = new Error(`API [GET ${path}] is not MOCKED!`);
    // eslint-disable-next-line no-console
    console.log(err);
    throw err;
  });
};
