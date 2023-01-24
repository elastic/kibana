/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Switch, MemoryRouter } from 'react-router-dom';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { PrivilegedRoute } from './privileged_route';
import type { PrivilegedRouteProps } from './privileged_route';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { AdministrationSubTab } from '../../types';
import { MANAGEMENT_ROUTING_RESPONSE_ACTIONS_HISTORY_PATH } from '../../common/constants';
import { MANAGEMENT_PATH } from '../../../../common/constants';

jest.mock('../../../common/hooks/use_experimental_features');

describe('PrivilegedRoute', () => {
  const noPrivilegesPageTestId = 'noPrivilegesPage';
  const noPermissionsPageTestId = 'noIngestPermissions';

  const componentTestId = 'component-to-render';
  let featureFlags: { endpointRbacEnabled: boolean; endpointRbacV1Enabled: boolean };

  let currentPath: string;
  let renderProps: PrivilegedRouteProps;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let render: () => void;

  beforeEach(() => {
    featureFlags = { endpointRbacEnabled: false, endpointRbacV1Enabled: false };
    currentPath = 'path';
    renderProps = {
      component: () => <div data-test-subj={componentTestId} />,
      path: 'path',
      hasPrivilege: true,
    };

    const renderer = createAppRootMockRenderer();

    render = () => {
      renderResult = renderer.render(
        <MemoryRouter initialEntries={[currentPath]}>
          <Switch>
            <PrivilegedRoute {...renderProps} />
          </Switch>
        </MemoryRouter>
      );
    };

    const useIsExperimentalFeatureEnabledMock = (feature: keyof typeof featureFlags) =>
      featureFlags[feature];

    (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation(
      useIsExperimentalFeatureEnabledMock
    );
  });

  const testCommonPathsForAllFeatureFlags = () => {
    it('renders component if it has privileges and on correct path', async () => {
      render();

      expect(renderResult.getByTestId(componentTestId)).toBeTruthy();
      expect(renderResult.queryByTestId(noPermissionsPageTestId)).toBeNull();
      expect(renderResult.queryByTestId(noPrivilegesPageTestId)).toBeNull();
    });

    it('renders nothing if path is different', async () => {
      renderProps.path = 'different';

      render();

      expect(renderResult.queryByTestId(componentTestId)).toBeNull();
      expect(renderResult.queryByTestId(noPermissionsPageTestId)).toBeNull();
      expect(renderResult.queryByTestId(noPrivilegesPageTestId)).toBeNull();
    });
  };

  describe('no feature flags', () => {
    testCommonPathsForAllFeatureFlags();

    it('renders `you need to be superuser` if no privileges', async () => {
      renderProps.hasPrivilege = false;

      render();

      expect(renderResult.getByTestId(noPermissionsPageTestId)).toBeTruthy();
      expect(renderResult.queryByTestId(componentTestId)).toBeNull();
      expect(renderResult.queryByTestId(noPrivilegesPageTestId)).toBeNull();
    });
  });

  describe('endpointRbacV1Enabled', () => {
    beforeEach(() => {
      featureFlags.endpointRbacV1Enabled = true;
    });

    testCommonPathsForAllFeatureFlags();

    describe('no privileges', () => {
      it('renders `you need to have privileges` on Response actions history', async () => {
        renderProps.hasPrivilege = false;
        renderProps.path = MANAGEMENT_ROUTING_RESPONSE_ACTIONS_HISTORY_PATH;
        currentPath = `${MANAGEMENT_PATH}/${AdministrationSubTab.responseActionsHistory}`;

        render();

        expect(renderResult.getByTestId(noPrivilegesPageTestId)).toBeTruthy();
        expect(renderResult.queryByTestId(noPermissionsPageTestId)).toBeNull();
        expect(renderResult.queryByTestId(componentTestId)).toBeNull();
      });

      it('renders `you need to be superuser` on other pages', async () => {
        renderProps.hasPrivilege = false;

        render();

        expect(renderResult.getByTestId(noPermissionsPageTestId)).toBeTruthy();
        expect(renderResult.queryByTestId(noPrivilegesPageTestId)).toBeNull();
        expect(renderResult.queryByTestId(componentTestId)).toBeNull();
      });
    });
  });

  describe('endpointRbacEnabled', () => {
    beforeEach(() => {
      featureFlags.endpointRbacEnabled = true;
    });

    testCommonPathsForAllFeatureFlags();

    it('renders `you need to have RBAC privileges` if no privileges', async () => {
      renderProps.hasPrivilege = false;

      render();

      expect(renderResult.getByTestId(noPrivilegesPageTestId)).toBeTruthy();
      expect(renderResult.queryByTestId(noPermissionsPageTestId)).toBeNull();
      expect(renderResult.queryByTestId(componentTestId)).toBeNull();
    });
  });
});
