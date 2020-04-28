/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock } from 'src/core/public/mocks';
import { renderApp } from '../applications';

describe('renderApp', () => {
  it('mounts and unmounts UI', () => {
    const params = coreMock.createAppMountParamters();
    const core = coreMock.createStart();

    const unmount = renderApp(core, params, {});
    expect(params.element.querySelector('.setup-guide')).not.toBeNull();
    unmount();
    expect(params.element.innerHTML).toEqual('');
  });
});
