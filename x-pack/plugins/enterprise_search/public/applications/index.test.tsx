/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { coreMock } from 'src/core/public/mocks';
import { licensingMock } from '../../../licensing/public/mocks';

import { renderApp, renderHeaderActions } from './';
import { EnterpriseSearch } from './enterprise_search';
import { AppSearch } from './app_search';
import { WorkplaceSearch } from './workplace_search';

describe('renderApp', () => {
  const kibanaDeps = {
    params: coreMock.createAppMountParamters(),
    core: coreMock.createStart(),
    plugins: { licensing: licensingMock.createStart() },
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

    it('renders EnterpriseSearch', () => {
      mount(EnterpriseSearch);
      expect(mockContainer.querySelector('.enterpriseSearchOverview')).not.toBeNull();
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
});

describe('renderHeaderActions', () => {
  it('mounts and unmounts any HeaderActions component', () => {
    const mockHeaderEl = document.createElement('header');
    const MockHeaderActions = () => <button className="hello-world">Hello World</button>;

    const unmount = renderHeaderActions(MockHeaderActions, mockHeaderEl);
    expect(mockHeaderEl.querySelector('.hello-world')).not.toBeNull();

    unmount();
    expect(mockHeaderEl.innerHTML).toEqual('');
  });
});
