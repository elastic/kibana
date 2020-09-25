/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { coreMock } from 'src/core/public/mocks';
import { licensingMock } from '../../../licensing/public/mocks';

import { renderApp, renderHeaderActions } from './';
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

  it('mounts and unmounts UI', () => {
    const MockApp = () => <div className="hello-world">Hello world!</div>;

    const unmount = renderApp(MockApp, kibanaDeps, pluginData);
    expect(kibanaDeps.params.element.querySelector('.hello-world')).not.toBeNull();

    unmount();
    expect(kibanaDeps.params.element.innerHTML).toEqual('');
  });

  it('renders AppSearch', () => {
    renderApp(AppSearch, kibanaDeps, pluginData);
    expect(kibanaDeps.params.element.querySelector('.setupGuide')).not.toBeNull();
  });

  it('renders WorkplaceSearch', () => {
    renderApp(WorkplaceSearch, kibanaDeps, pluginData);
    expect(kibanaDeps.params.element.querySelector('.setupGuide')).not.toBeNull();
  });
});

describe('renderHeaderActions', () => {
  it('mounts and unmounts any HeaderActions component', () => {
    const mockHeaderEl = document.createElement('header');
    const MockHeaderActions = () => <button className="hello-world">Hello World</button>;

    const unmount = renderHeaderActions(MockHeaderActions, mockHeaderEl, {} as any);
    expect(mockHeaderEl.querySelector('.hello-world')).not.toBeNull();

    unmount();
    expect(mockHeaderEl.innerHTML).toEqual('');
  });
});
