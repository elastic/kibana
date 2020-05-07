/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock } from 'src/core/public/mocks';
import { licensingMock } from '../../../licensing/public/mocks';

import { renderApp } from './';

describe('renderApp', () => {
  it('mounts and unmounts UI', () => {
    const params = coreMock.createAppMountParamters();
    const core = coreMock.createStart();
    const config = {};
    const plugins = {
      licensing: licensingMock.createSetup(),
    };

    const unmount = renderApp(core, params, config, plugins);
    expect(params.element.querySelector('.setup-guide')).not.toBeNull();
    unmount();
    expect(params.element.innerHTML).toEqual('');
  });
});
