/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { searchConnectorsMock } from '@kbn/search-connectors-plugin/public/plugin.mock';

import React from 'react';

import { act } from '@testing-library/react';
import { getContext } from 'kea';

import { Observable } from 'rxjs';

import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { guidedOnboardingMock } from '@kbn/guided-onboarding-plugin/public/mocks';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { lensPluginMock } from '@kbn/lens-plugin/public/mocks';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { mlPluginMock } from '@kbn/ml-plugin/public/mocks';
import { navigationPluginMock } from '@kbn/navigation-plugin/public/mocks';
import { securityMock } from '@kbn/security-plugin/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';

import { AppSearch } from './app_search';
import { EnterpriseSearchOverview } from './enterprise_search_overview';
import { KibanaLogic } from './shared/kibana';
import { WorkplaceSearch } from './workplace_search';

import { renderApp, renderHeaderActions } from '.';

describe('renderApp', () => {
  const kibanaDeps = {
    core: coreMock.createStart(),
    params: coreMock.createAppMountParameters(),
    plugins: {
      charts: chartPluginMock.createStartContract(),
      data: dataPluginMock.createStartContract(),
      guidedOnboarding: guidedOnboardingMock.createStart(),
      indexManagement: {
        getIndexMappingComponent: jest.fn(),
      },
      lens: lensPluginMock.createStartContract(),
      licensing: licensingMock.createStart(),
      navigation: navigationPluginMock.createStartContract(),
      searchConnectors: searchConnectorsMock.createStart(),
      security: securityMock.createStart(),
      share: sharePluginMock.createStartContract(),
      ml: mlPluginMock.createStartContract(),
      user: {},
    },
    updateSideNavDefinition: jest.fn(),
  } as any;
  const pluginData = {
    config: {},
    data: {},
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockContainer = kibanaDeps.params.element;
  const MockApp = () => (
    <div className="hello-world">
      {i18n.translate('xpack.enterpriseSearch.mockApp.div.helloWorldLabel', {
        defaultMessage: 'Hello world',
      })}
    </div>
  );

  it('mounts and unmounts UI', () => {
    const unmount = renderApp(MockApp, kibanaDeps, pluginData);
    expect(mockContainer.querySelector('.hello-world')).not.toBeNull();

    act(() => unmount());
    expect(mockContainer.innerHTML).toEqual('');
  });

  /**
   * Helper for automatically mounting and unmounting future tests
   */
  let unmount: any;
  const mount = (App: React.FC) => {
    unmount = renderApp(App, kibanaDeps, pluginData);
  };

  describe('Enterprise Search apps', () => {
    afterEach(() => {
      act(() => {
        unmount();
      });
    });

    it('renders EnterpriseSearchOverview', () => {
      act(() => {
        mount(EnterpriseSearchOverview);
      });
      expect(mockContainer.querySelector('.kbnPageTemplate')).not.toBeNull();
    });

    it('renders AppSearch', () => {
      act(() => {
        mount(AppSearch);
      });
      expect(mockContainer.querySelector('.setupGuide')).not.toBeNull();
    });

    it('renders WorkplaceSearch', () => {
      act(() => {
        mount(WorkplaceSearch);
      });
      expect(mockContainer.querySelector('.setupGuide')).not.toBeNull();
    });
  });

  describe('renderHeaderActions', () => {
    const mockHeaderEl = document.createElement('header');
    const MockHeaderActions = () => (
      <button className="hello-world">
        <FormattedMessage
          id="xpack.enterpriseSearch.mockHeaderActions.button.helloWorldLabel"
          defaultMessage="Hello World"
        />
      </button>
    );

    it('mounts and unmounts any HeaderActions component', () => {
      const store = getContext().store;

      const unmountHeader = renderHeaderActions(
        MockHeaderActions,
        store,
        { theme$: new Observable() } as any,
        mockHeaderEl
      );
      expect(mockHeaderEl.querySelector('.hello-world')).not.toBeNull();

      unmountHeader();
      expect(mockHeaderEl.innerHTML).toEqual('');
    });

    it('passes a renderHeaderActions helper to KibanaLogic, which can be used by our apps to render HeaderActions', () => {
      // Setup
      kibanaDeps.params.setHeaderActionMenu.mockImplementationOnce((cb: any) => cb(mockHeaderEl));
      mount(MockApp);

      // Call KibanaLogic's renderHeaderActions, which should call params.setHeaderActionMenu
      KibanaLogic.values.renderHeaderActions(MockHeaderActions);
      expect(kibanaDeps.params.setHeaderActionMenu).toHaveBeenCalled();

      // renderHeaderActions should have been called and generated the correct DOM
      expect(mockHeaderEl.querySelector('.hello-world')).not.toBeNull();
      unmount();
    });
  });
});
