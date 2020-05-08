/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { coreMock } from 'src/core/public/mocks';
import { licensingMock } from '../../../licensing/public/mocks';

import { renderApp } from './';
import { AppSearch } from './app_search';

describe('renderApp', () => {
  const params = coreMock.createAppMountParamters();
  const core = coreMock.createStart();
  const config = {};
  const plugins = {
    licensing: licensingMock.createSetup(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('mounts and unmounts UI', () => {
    const MockApp: React.FC = () => <div className="hello-world">Hello world!</div>;

    const unmount = renderApp(MockApp, core, params, config, plugins);
    expect(params.element.querySelector('.hello-world')).not.toBeNull();
    unmount();
    expect(params.element.innerHTML).toEqual('');
  });

  it('renders AppSearch', () => {
    renderApp(AppSearch, core, params, config, plugins);
    expect(params.element.querySelector('.setup-guide')).not.toBeNull();
  });
});
