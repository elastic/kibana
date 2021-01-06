/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createTestRendererMock, epmDetailsApiMock, TestRenderer } from '../../../../mock';
import { Detail } from './index';
import React, { lazy, memo } from 'react';
import { PAGE_ROUTING_PATHS, pagePathGetters } from '../../../../constants';
import { Route } from 'react-router-dom';
import { DetailViewPanelName } from '../../../../../../../common/types/models';
import { act, cleanup } from '@testing-library/react';

describe('when on integration detail', () => {
  const pkgkey = 'nginx-0.3.7';
  const detailPageUrlPath = pagePathGetters.integration_details({ pkgkey });
  let testRenderer: TestRenderer;
  let renderResult: ReturnType<typeof testRenderer.render>;
  let mockedHttp: ReturnType<typeof epmDetailsApiMock>;
  const render = () =>
    (renderResult = testRenderer.render(
      <Route path={PAGE_ROUTING_PATHS.integration_details}>
        <Detail />
      </Route>
    ));

  beforeEach(() => {
    testRenderer = createTestRendererMock();
    mockedHttp = epmDetailsApiMock(testRenderer.startServices.http);
    testRenderer.history.push(detailPageUrlPath);
  });

  afterEach(() => {
    cleanup();
    window.location.hash = '#/';
  });

  describe('and the package is installed', () => {
    beforeEach(() => render());

    it('should display agent policy usage count', async () => {
      await mockedHttp.waitForApi();
      expect(renderResult.queryByTestId('agentPolicyCount')).not.toBeNull();
    });

    it('should show the Policies tab', async () => {
      await mockedHttp.waitForApi();
      expect(renderResult.queryByTestId('tab-policies')).not.toBeNull();
    });
  });

  describe('and the package is not installed', () => {
    beforeEach(() => {
      const unInstalledPackage = mockedHttp.responseProvider.epmGetInfo();
      unInstalledPackage.response.status = 'not_installed';
      mockedHttp.responseProvider.epmGetInfo.mockReturnValue(unInstalledPackage);
      render();
    });

    it('should NOT display agent policy usage count', async () => {
      await mockedHttp.waitForApi();
      expect(renderResult.queryByTestId('agentPolicyCount')).toBeNull();
    });

    it('should NOT the Policies tab', async () => {
      await mockedHttp.waitForApi();
      expect(renderResult.queryByTestId('tab-policies')).toBeNull();
    });
  });

  describe('and a custom UI extension is NOT registered', () => {
    beforeEach(() => render());

    it('should show overview and settings tabs', () => {
      const tabs: DetailViewPanelName[] = ['overview', 'settings'];
      for (const tab of tabs) {
        expect(renderResult.getByTestId(`tab-${tab}`));
      }
    });

    it('should not show a custom tab', () => {
      expect(renderResult.queryByTestId('tab-custom')).toBeNull();
    });

    it('should redirect if custom url is accessed', () => {
      act(() => {
        testRenderer.history.push(
          pagePathGetters.integration_details({ pkgkey: 'nginx-0.3.7', panel: 'custom' })
        );
      });
      expect(testRenderer.history.location.pathname).toEqual(detailPageUrlPath);
    });
  });

  describe('and a custom UI extension is registered', () => {
    // Because React Lazy components are loaded async (Promise), we setup this "watcher" Promise
    // that is `resolved` once the lazy components actually renders.
    let lazyComponentWasRendered: Promise<void>;

    beforeEach(() => {
      let setWasRendered: () => void;
      lazyComponentWasRendered = new Promise((resolve) => {
        setWasRendered = resolve;
      });

      const CustomComponent = lazy(async () => {
        return {
          default: memo(() => {
            setWasRendered();
            return <div data-test-subj="custom-hello">hello</div>;
          }),
        };
      });

      testRenderer.startInterface.registerExtension({
        package: 'nginx',
        view: 'package-detail-custom',
        component: CustomComponent,
      });

      render();
    });

    afterEach(() => {
      // @ts-ignore
      lazyComponentWasRendered = undefined;
    });

    it('should display "custom" tab in navigation', () => {
      expect(renderResult.getByTestId('tab-custom'));
    });

    it('should display custom content when tab is clicked', async () => {
      act(() => {
        testRenderer.history.push(
          pagePathGetters.integration_details({ pkgkey: 'nginx-0.3.7', panel: 'custom' })
        );
      });
      await lazyComponentWasRendered;
      expect(renderResult.getByTestId('custom-hello'));
    });
  });

  describe('and the Add integration button is clicked', () => {
    beforeEach(() => render());

    it('should link to the create page', () => {
      const addButton = renderResult.getByTestId('addIntegrationPolicyButton') as HTMLAnchorElement;
      expect(addButton.href).toEqual(
        'http://localhost/mock/app/fleet#/integrations/nginx-0.3.7/add-integration'
      );
    });

    it('should link to create page with route state for return trip', () => {
      const addButton = renderResult.getByTestId('addIntegrationPolicyButton') as HTMLAnchorElement;
      act(() => addButton.click());
      expect(testRenderer.history.location.state).toEqual({
        onCancelNavigateTo: [
          'fleet',
          {
            path: '#/integrations/detail/nginx-0.3.7',
          },
        ],
        onCancelUrl: '#/integrations/detail/nginx-0.3.7',
        onSaveNavigateTo: [
          'fleet',
          {
            path: '#/integrations/detail/nginx-0.3.7',
          },
        ],
      });
    });
  });

  describe('and on the Policies Tab', () => {
    const policiesTabURLPath = pagePathGetters.integration_details({ pkgkey, panel: 'policies' });
    beforeEach(() => {
      testRenderer.history.push(policiesTabURLPath);
      render();
    });

    it('should display policies list', () => {
      const table = renderResult.getByTestId('integrationPolicyTable');
      expect(table).not.toBeNull();
    });

    it('should link to integration policy detail when an integration policy is clicked', async () => {
      await mockedHttp.waitForApi();
      const firstPolicy = renderResult.getAllByTestId(
        'integrationNameLink'
      )[0] as HTMLAnchorElement;
      expect(firstPolicy.href).toEqual(
        'http://localhost/mock/app/fleet#/integrations/edit-integration/e8a37031-2907-44f6-89d2-98bd493f60dc'
      );
    });

    it('should NOT show link for agent count if it is zero', async () => {
      await mockedHttp.waitForApi();
      const firstRowAgentCount = renderResult.getAllByTestId('rowAgentCount')[0];
      expect(firstRowAgentCount.textContent).toEqual('0');
      expect(firstRowAgentCount.tagName).not.toEqual('A');
    });

    it('should show link for agent count if greater than zero', async () => {
      await mockedHttp.waitForApi();
      const secondRowAgentCount = renderResult.getAllByTestId('rowAgentCount')[1];
      expect(secondRowAgentCount.textContent).toEqual('100');
      expect(secondRowAgentCount.tagName).toEqual('A');
    });
  });
});
