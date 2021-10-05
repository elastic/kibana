/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../../common/mock/endpoint';
import { getPolicyDetailsArtifactsListPath } from '../../../../../common/routing';
import { PolicyTrustedAppsList } from './policy_trusted_apps_list';
import React from 'react';
import { policyDetailsPageAllApiHttpMocks } from '../../../test_utils';
import { isLoadedResourceState } from '../../../../../state';

describe('when rendering the PolicyTrustedAppsList', () => {
  let appTestContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let render: () => Promise<ReturnType<AppContextTestRender['render']>>;
  let apiResponseProviders: ReturnType<typeof policyDetailsPageAllApiHttpMocks>;
  let waitForAction: AppContextTestRender['middlewareSpy']['waitForAction'];

  beforeEach(() => {
    appTestContext = createAppRootMockRenderer();

    apiResponseProviders = policyDetailsPageAllApiHttpMocks(appTestContext.coreStart.http);
    appTestContext.setExperimentalFlag({ trustedAppsByPolicyEnabled: true });
    waitForAction = appTestContext.middlewareSpy.waitForAction;

    render = async () => {
      appTestContext.history.push(getPolicyDetailsArtifactsListPath('1'));
      const trustedAppDataReceived = waitForAction('assignedTrustedAppsListStateChanged', {
        validate({ payload }) {
          return isLoadedResourceState(payload);
        },
      });

      renderResult = appTestContext.render(<PolicyTrustedAppsList />);
      await trustedAppDataReceived;

      return renderResult;
    };
  });

  // FIXME: implement this test once PR #113802 is merged
  it.todo('should show loading spinner if checking to see if trusted apps exist');

  it('should show total number of of items being displayed', async () => {
    await render();
    expect(renderResult.getByTestId('policyDetailsTrustedAppsCount').textContent).toBe(
      'Showing 10 trusted applications'
    );
  });

  it.todo('should show card grid');

  it.todo('should expand card and collapse card');

  it.todo('should show action menu on card');

  it.todo('should have navigate to trusted apps page when view full details action is clicked');

  it.todo('should display policy names on assignment context menu');

  it.todo('should handle pagination changes');
});
