/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { getContext } from 'kea';

import { coreMock } from '../../../../../src/core/public/mocks';
import { chartPluginMock } from '../../../../../src/plugins/charts/public/mocks';
import { licensingMock } from '../../../licensing/public/mocks';
import { securityMock } from '../../../security/public/mocks';

import { AppSearch } from './app_search';
import { EnterpriseSearchOverview } from './enterprise_search_overview';
import { KibanaLogic } from './shared/kibana';
import { WorkplaceSearch } from './workplace_search';

import { renderApp, renderHeaderActions } from './';

describe('renderApp', () => {
  const kibanaDeps = {
    params: coreMock.createAppMountParameters(),
    core: coreMock.createStart(),
    plugins: {
      licensing: licensingMock.createStart(),
      charts: chartPluginMock.createStartContract(),
      security: securityMock.createStart(),
    },
  } as any;
  const pluginData = {
    config: {},
    data: {},
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockContainer = kibanaDeps.params.element;
  const MockApp = () => <div className="hello-world">Hello world!</div>;

  it('mounts and unmounts UI', () => {
    const unmount = renderApp(MockApp, kibanaDeps, pluginData);
    expect(mockContainer.querySelector('.hello-world')).not.toBeNull();

    unmount();
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
    afterEach(() => unmount());

    it('renders EnterpriseSearchOverview', () => {
      mount(EnterpriseSearchOverview);
      expect(mockContainer.querySelector('.kbnPageTemplate')).not.toBeNull();
    });

    it('renders AppSearch', () => {
      mount(AppSearch);
      expect(mockContainer.querySelector('.setupGuide')).not.toBeNull();
    });

    it('renders WorkplaceSearch', () => {
      mount(WorkplaceSearch);
      expect(mockContainer.querySelector('.setupGuide')).not.toBeNull();
    });
  });

  describe('renderHeaderActions', () => {
    const mockHeaderEl = document.createElement('header');
    const MockHeaderActions = () => <button className="hello-world">Hello World</button>;

    it('mounts and unmounts any HeaderActions component', () => {
      const store = getContext().store;

      const unmountHeader = renderHeaderActions(MockHeaderActions, store, mockHeaderEl);
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
